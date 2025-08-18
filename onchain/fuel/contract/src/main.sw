contract;

use std::time::*;
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

struct InstantFleet {
    from: u64,
    spaceships: u64,
    destination: u64,
}

struct EventualFleet {
    from: u64,
    spaceships: u64,
    destination_hash: b256,
}

enum Action {
    Activate: Activation,
    InstantSend: InstantFleet,
    EventualSend: EventualFleet,
}

// struct RevealedFleet {
//     epoch: u64,
//     from: u64,
//     spaceships: u64,
//     destination: u64,
// }

// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// STORAGE TYPES
// ----------------------------------------------------------------------------
struct Commitment {
    hash: b256,
    epoch: u64,
}
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
// STORAGE
// ----------------------------------------------------------------------------
storage {
    // ------------------------------------------------------------------------
    // TODO remove, used for testing only
    // ------------------------------------------------------------------------
    time_delta: Duration = Duration::seconds(0),
    // ------------------------------------------------------------------------
    commitments: StorageMap<Identity, Commitment> = StorageMap {},
    // star_systems: StorageMap<u64, StarSystem> = StorageMap {},
    // fleets: StorageMap<b256, Fleet> = StorageMap {},
}
// ----------------------------------------------------------------------------



// ----------------------------------------------------------------------------
// CONSTANTS AND CONFIGURABLES
// ----------------------------------------------------------------------------

const COMMIT_PHASE_DURATION: Duration = Duration::seconds(22 * 60 * 60); // 22 hour
const REVEAL_PHASE_DURATION: Duration = Duration::seconds(2 * 60 * 60); // 2 hour
const START_TIME: Time = Time::new(0);

// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// FUNCTIONS
// ----------------------------------------------------------------------------
#[storage(read)]
fn _epoch() -> (u64, bool) {
    let epoch_duration = COMMIT_PHASE_DURATION + REVEAL_PHASE_DURATION;
    let time = _timestamp();
    let time_passed: Duration = time.duration_since(START_TIME).unwrap();

    // epoch start at 2, this make the hypothetical previous reveal phase's epoch to be 1
    let epoch = time_passed.as_seconds() / (epoch_duration.as_seconds()) + 2;
    let commiting = time_passed.as_seconds() - ((epoch - 2) * epoch_duration.as_seconds()) < COMMIT_PHASE_DURATION.as_seconds();
    (epoch, commiting)
}

#[storage(read)]
fn _timestamp() -> Time {
    Time::now() + storage.time_delta.try_read().unwrap_or(Duration::seconds(0))
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
// ----------------------------------------------------------------------------



// ----------------------------------------------------------------------------
// IMPLEMENTATION
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
        let mut time_delta = storage.time_delta.try_read().unwrap_or(Duration::seconds(0));
        time_delta += Duration::seconds(seconds);
        storage.time_delta.write(time_delta);
    }
    // ------------------------------------------------------------------------
    #[storage(write, read)]
    fn commit_actions(hash: b256) {
        let (epoch, commiting) = _epoch();

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
        commitment.epoch = epoch;
        storage.commitments.insert(account, commitment);

        log(CommitmentSubmitted {
            account: account,
            epoch: epoch,
            hash: hash,
        });
    }

    #[storage(write, read)]
    fn reveal_actions(account: Identity, secret: b256, actions: Vec<Action>) {
        let (epoch, commiting) = _epoch();
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

        // TODO process actions
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
    actions.push(Action::InstantSend(InstantFleet {
        from: 1,
        spaceships: 100,
        destination: 2,
    }));
    actions.push(Action::EventualSend(EventualFleet {
        from: 1,
        spaceships: 100,
        destination_hash: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
    }));
    let secret = 0x0000000000000000000000000000000000000000000000000000000000000001;
    let hash = _hash_actions(actions, secret);
    caller.commit_actions(hash);

    caller.increase_time(COMMIT_PHASE_DURATION.as_seconds());

    caller.reveal_actions(identity, secret, actions);
}

#[test(should_revert)] //  = "CommitmentHashNotMatching"
fn fails_to_reveal_if_hashes_do_not_match() {
    let caller = abi(Space, CONTRACT_ID);
    let identity = caller.identity();

    let mut actions: Vec<Action> = Vec::new();
    actions.push(Action::Activate(Activation { system: 1 }));
    actions.push(Action::InstantSend(InstantFleet {
        from: 1,
        spaceships: 100,
        destination: 2,
    }));
    actions.push(Action::EventualSend(EventualFleet {
        from: 1,
        spaceships: 100,
        destination_hash: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
    }));
    let secret = 0x0000000000000000000000000000000000000000000000000000000000000001;
    let failing_secret = 0x0000000000000000000000000000000000000000000000000000000000000002;
    let hash = _hash_actions(actions, secret);
    caller.commit_actions(hash);

    caller.increase_time(COMMIT_PHASE_DURATION.as_seconds());

    caller.reveal_actions(identity, failing_secret, actions);
}

// ----------------------------------------------------------------------------
