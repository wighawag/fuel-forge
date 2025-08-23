contract;

use std::time::Time;
use std::logging::log;
use std::codec::encode;
use std::bytes::Bytes;
use std::hash::*;

// ----------------------------------------------------------------------------
// EXTERNAL TYPES
// ----------------------------------------------------------------------------
struct Activation {
    system: u64,
    // TODO add bets
}

impl Hash for Activation {
    fn hash(self, ref mut hasher: Hasher) {
        self.system.hash(hasher);
        // TODO add bets
    }
}

enum Destination {
    Eventual: b256, // hash of the destination
    Known: u64, // id of the destination
}

impl Hash for Destination {
    fn hash(self, ref mut hasher: Hasher) {
        match self {
            Destination::Eventual(val) => val.hash(hasher),
            Destination::Known(val) => val.hash(hasher),
        }
    }
}

struct Fleet {
    from: u64,
    spaceships: u64,
    destination: Destination,
}

impl Hash for Fleet {
    fn hash(self, ref mut hasher: Hasher) {
        self.from.hash(hasher);
        self.spaceships.hash(hasher);
        self.destination.hash(hasher);
    }
}


enum Action {
    Activate: Activation,
    SendFleet: Fleet
}

impl Hash for Action {
    fn hash(self, ref mut hasher: Hasher) {
        match self {
            Action::Activate(activation) => activation.hash(hasher),
            Action::SendFleet(fleet) => fleet.hash(hasher),
        }
    }
}

// struct RevealedFleet {
//     epoch: u64,
//     from: u64,
//     spaceships: u64,
//     destination: u64,
// }
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// EVENT TYPES
// ----------------------------------------------------------------------------
struct CommitmentSubmitted {
    account: Identity,
    epoch: u64,
    hash: b256,
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// ERROR TYPES
// ----------------------------------------------------------------------------
#[error_type]
pub enum SpaceError {
    #[error(m = "Not Commit Allowed in Reveal Phase")]
    InRevealPhase: (),
    #[error(m = "Previous commitment need to be revealed before committing again")]
    PreviousCommitmentNotRevealed: (),
    #[error(m = "No Reveal Allowed in Commitment Phase")]
    InCommitmentPhase: (),
    #[error(m = "There is nothing to reveal")]
    NothingToReveal: (),
    #[error(m = "Invalid epoch, you can only reveal actions in the current epoch")]
    InvalidEpoch: (),
    #[error(m = "Hash revealed does not match the one computed from actions and secret")]
    CommitmentHashNotMatching: (),
    #[error(m = "Cannot Activate Star System Owned By Someone Else")]
    CannotActivateSystemOwnedBySomeoneElse: (),
    #[error(m = "System cannot be activated if already so")]
    AlreadyActivated: (),
    #[error(m = "Only Owner Can Perfrom Action From Star System")]
    NotOwner: (),
    #[error(m = "Not enough spaceships to send the fleet")]
    NotEnoughSpaceships: (),
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// ABI
// ----------------------------------------------------------------------------
abi Space {
    // ------------------------------------------------------------------------
    // TODO remove, used for testing only
    // ------------------------------------------------------------------------
    fn identity() -> Identity;

    #[storage(write, read)]
    fn increase_time(seconds: u64);

    #[storage(read)]
    fn get_time() -> u64;
    // ------------------------------------------------------------------------
    #[storage(write, read)]
    fn commit_actions(hash: b256);

    #[storage(write, read)]
    fn reveal_actions(account: Identity, secret: b256, actions: Vec<Action>);

    // #[storage(write, read)]
    // fn reveal_arrivals(Fleet[]);
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// STORAGE TYPES
// ----------------------------------------------------------------------------
struct Commitment {
    hash: b256,
    epoch: u64,
}

struct StarSystemState {
    owner: Option<Identity>,
    activated: bool,
    spaceships: u64,
    last_update: u64,
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// STORAGE
// ----------------------------------------------------------------------------
storage {
    // ------------------------------------------------------------------------
    // TODO remove, used for testing only
    // ------------------------------------------------------------------------
    time_delta: u64 = 0,
    // ------------------------------------------------------------------------
    commitments: StorageMap<Identity, Commitment> = StorageMap {},
    star_system_states: StorageMap<u64, StarSystemState> = StorageMap {},
    // fleets: StorageMap<b256, Fleet> = StorageMap {},
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// CONSTANTS AND CONFIGURABLES
// ----------------------------------------------------------------------------
const COMMIT_PHASE_DURATION: u64 = 22 * 60 * 60; // 22 hour
const REVEAL_PHASE_DURATION: u64 = 2 * 60 * 60; // 2 hour
const START_TIME: u64 = 0;
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// INTERNAL FUNCTIONS
// ----------------------------------------------------------------------------
#[storage(read)]
fn _epoch() -> (u64, bool, u64) {
    // log("_epoch()");
    let epoch_duration = (COMMIT_PHASE_DURATION + REVEAL_PHASE_DURATION);
    // log(epoch_duration);
    let time = _time();
    // log(time);
    let time_passed = time - START_TIME;
    // log(time_passed);

    // minimum epoch is 2, this make the minimal hypothetical previous reveal phase's epoch to be non-zero
    let epoch = time_passed / epoch_duration + 2;
    // log(epoch);
    let commiting = (time_passed - ((epoch - 2) * epoch_duration)) < COMMIT_PHASE_DURATION;
    // log(commiting);
    // log("--------------------------------");
    (epoch, commiting, time)
}

#[storage(read)]
fn _time() -> u64 {
    const TAI_64_CONVERTER: u64 = 10 + (1 << 62);
    Time::now().as_tai64() - TAI_64_CONVERTER  + storage.time_delta.try_read().unwrap_or(0)
}

fn _hash_actions(actions: Vec<Action>, secret: b256) -> b256 {
     sha256(
        {
            let mut bytes = Bytes::new();
            bytes
                .append(Bytes::from(encode(actions)));
            bytes
                .append(Bytes::from(encode(secret)));
            bytes
        },
    )

    // let hasher = Hasher::default();
    // actions.hash(hasher);
    // secret.hash(hasher);
    // hasher.sha256()
    // sha256((
    //     actions,
    //     secret,
    // ))
}
fn _check_hash(commitment_hash: b256, actions: Vec<Action>, secret: b256) {
    // TODO reaction
    if commitment_hash == 0x0000000000000000000000000000000000000000000000000000000000000000
    {
        return;
    }

    let computed_hash = _hash_actions(actions, secret);

    if commitment_hash != computed_hash {
        panic SpaceError::CommitmentHashNotMatching;
    }
}

#[storage(read)]
fn _get_star_system_state(system: u64, time: u64) -> StarSystemState {
    // TODO use match to not update when not existing
    let mut star_system_state = storage.star_system_states.get(system).try_read().unwrap_or(StarSystemState {
        owner: Option::None,
        activated: false,
        spaceships: 0,
        last_update: time,
    });
    _update_star_system(star_system_state, time);
    star_system_state
}


fn _update_star_system(ref mut star_system_state: StarSystemState, time: u64) {
    let time_passed = time - star_system_state.last_update;
    if (time_passed == 0) {
        return;
    }
    star_system_state.last_update = time;
    if star_system_state.activated {
        star_system_state.spaceships += time_passed; // 1 spaceship per seconds // TODO production
        // TODO overflow ?

        if star_system_state.spaceships > 600000 {
            star_system_state.spaceships = 600000; // TODO max production
        }

        // TODO (not necessary) calculate the time_passed based on the number of spaceships produced to ensure the number cannot be frozen by constantly updating the planet
    } else {
        let destruction = time_passed / 2; // 1 spaceship per 2 seconds // TODO harshness
        if star_system_state.spaceships < destruction {
            star_system_state.spaceships = 0;
            star_system_state.owner = Option::None;
        } else {
            star_system_state.spaceships -= destruction;
        }
        
        // TODO calculate the time_passed based on the number of spaceships removed to ensure the number cannot be frozen by constantly updating the planet
    }
}


fn _resolve_fleet_arrival(
    fleet: Fleet,
    destination: u64
) {
    // TODO implement
    // This function should be called when the fleet arrives at its destination
    // It should update the state of the star system and the fleet accordingly
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// ABI IMPLEMENTATION
// ----------------------------------------------------------------------------
impl Space for Contract {
    // ------------------------------------------------------------------------
    // TODO remove, used for testing only
    // ------------------------------------------------------------------------
    fn identity() -> Identity {
        msg_sender().unwrap()
    }
    #[storage(write, read)]
    fn increase_time(seconds: u64) {
        let mut time_delta = storage.time_delta.try_read().unwrap_or(0);
        time_delta += seconds;
        storage.time_delta.write(time_delta);
    }
    #[storage(read)]
    fn get_time() -> u64 {
        _time()
    }
    // ------------------------------------------------------------------------
    #[storage(write, read)]
    fn commit_actions(hash: b256) {
        // let (epoch, commiting, _time) = _epoch();

        log("_epoch()");
        let epoch_duration = (COMMIT_PHASE_DURATION + REVEAL_PHASE_DURATION);
        log(epoch_duration);
        let time = _time();
        log(time);
        let time_passed = time - START_TIME;
        log(time_passed);

        // minimum epoch is 2, this make the minimal hypothetical previous reveal phase's epoch to be non-zero
        let epoch = time_passed / epoch_duration + 2;
        log(epoch);
        let commiting = (time_passed - ((epoch - 2) * epoch_duration)) < COMMIT_PHASE_DURATION;
        log(commiting);
        log("--------------------------------");

        if !commiting {
            panic SpaceError::InRevealPhase;
        }

        let account = msg_sender().unwrap();
        let mut commitment = storage.commitments.get(account).try_read().unwrap_or(Commitment {
            hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
            epoch: 0,
        });

        if commitment.epoch != 0 && commitment.epoch != epoch {
            panic SpaceError::PreviousCommitmentNotRevealed;
        }

        commitment.hash = hash;
        commitment.epoch = epoch ;
        storage.commitments.insert(account, commitment);

        log(epoch);

        log(CommitmentSubmitted {
            account: account,
            epoch: epoch,
            hash: hash,
        });
    }

    #[storage(write, read)]
    fn reveal_actions(account: Identity, secret: b256, actions: Vec<Action>) {
        let (epoch, commiting, time) = _epoch();

        log(epoch);

        if commiting {
            panic SpaceError::InCommitmentPhase;
        }
        let mut commitment = storage.commitments.get(account).try_read().unwrap_or(Commitment {
            hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
            epoch: 0,
        });

        if commitment.epoch == 0 {
            panic SpaceError::NothingToReveal;
        }
        if commitment.epoch != epoch {
            panic SpaceError::InvalidEpoch;
        }

        let hash_revealed = commitment.hash;
        _check_hash(hash_revealed, actions, secret);

        for action in actions.iter() {
            match action {
                Action::Activate(activation) => {
                    let system = activation.system;
                    let mut star_system_state = _get_star_system_state(system, time);
                    

                    if star_system_state.activated {
                        panic SpaceError::AlreadyActivated;
                    }

                    match star_system_state.owner {
                        Option::None => {

                        },
                        Option::Some(owner) => {
                            if owner != account {
                                panic SpaceError::CannotActivateSystemOwnedBySomeoneElse
                            }
                        }
                    }

                    
 
                    star_system_state.activated = true;
                    star_system_state.owner = Option::Some(account);
                    star_system_state.spaceships += 100000; // TODO add more logic
                    storage.star_system_states.insert(system, star_system_state);
                },
                Action::SendFleet(fleet) => {
                    let system = fleet.from;
                    let mut star_system_state = _get_star_system_state(system, time);


                    match star_system_state.owner {
                        Option::None => {
                            panic SpaceError::NotOwner
                        },
                        Option::Some(owner) => {
                            if owner != account {
                                panic SpaceError::NotOwner
                            }
                        }
                    }
 
                    if fleet.spaceships > star_system_state.spaceships {
                        panic SpaceError::NotEnoughSpaceships;
                    }

                    star_system_state.spaceships -= fleet.spaceships;
                    storage.star_system_states.insert(system, star_system_state);

                    // TODO events

                    match fleet.destination {
                        Destination::Known(destination) => {
                            _resolve_fleet_arrival(fleet, destination);
                        },
                        Destination::Eventual(_) => {

                        },
                    }
                },
            }
        }

        commitment.epoch = 0; // used
        storage.commitments.insert(account, commitment);
    }
}
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------------------
#[test]
fn can_commit_and_reveal() {
    let caller = abi(Space, CONTRACT_ID);
    let identity = caller.identity();

    let mut actions: Vec<Action> = Vec::new();
    actions.push(Action::Activate(Activation { system: 1 }));
    actions.push(Action::SendFleet(Fleet {
        from: 1,
        spaceships: 100,
        destination: Destination::Known(2),
    }));
    actions.push(Action::SendFleet(Fleet {
        from: 1,
        spaceships: 100,
        destination: Destination::Eventual(0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef),
    }));
    let secret = 0x0000000000000000000000000000000000000000000000000000000000000001;
    let hash = _hash_actions(actions, secret);
    caller.commit_actions(hash);

    caller.increase_time(COMMIT_PHASE_DURATION);

    caller.reveal_actions(identity, secret, actions);
}

#[test(should_revert)] //  = "CommitmentHashNotMatching"
fn fails_to_reveal_if_hashes_do_not_match() {
    let caller = abi(Space, CONTRACT_ID);
    let identity = caller.identity();

    let mut actions: Vec<Action> = Vec::new();
    actions.push(Action::Activate(Activation { system: 1 }));
    actions.push(Action::SendFleet(Fleet {
        from: 1,
        spaceships: 100,
        destination: Destination::Known(2),
    }));
    actions.push(Action::SendFleet(Fleet {
        from: 1,
        spaceships: 100,
        destination: Destination::Eventual(0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef),
    }));
    let secret = 0x0000000000000000000000000000000000000000000000000000000000000001;
    let failing_secret = 0x0000000000000000000000000000000000000000000000000000000000000002;
    let hash = _hash_actions(actions, secret);
    caller.commit_actions(hash);

    caller.increase_time(COMMIT_PHASE_DURATION);

    caller.reveal_actions(identity, failing_secret, actions);
}

#[test(should_revert)] //  = "CommitmentHashNotMatching"
fn fails_to_reveal_if_commit_phase() {
    let caller = abi(Space, CONTRACT_ID);
    let identity = caller.identity();

    let mut actions: Vec<Action> = Vec::new();
    actions.push(Action::Activate(Activation { system: 1 }));
    actions.push(Action::SendFleet(Fleet {
        from: 1,
        spaceships: 100,
        destination: Destination::Known(2),
    }));
    actions.push(Action::SendFleet(Fleet {
        from: 1,
        spaceships: 100,
        destination: Destination::Eventual(0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef),
    }));
    let secret = 0x0000000000000000000000000000000000000000000000000000000000000001;
    let hash = _hash_actions(actions, secret);
    caller.commit_actions(hash);

    caller.reveal_actions(identity, secret, actions);
}
// ----------------------------------------------------------------------------
