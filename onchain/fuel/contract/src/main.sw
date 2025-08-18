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
    destination: u64
}

struct LongRangeFleet {
    from: u64,
    spaceships: u64,
    destinationHash: b256
}

enum Action {
    Activate: Activation,
    InstantSend: InstantFleet,
    LongRangeSend: LongRangeFleet
}


struct RevealedFleet {
    epoch: u64,
    from: u64,
    spaceships: u64,
    destination: u64
}

// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// STORAGE TYPES
// ----------------------------------------------------------------------------
struct Commitment {
    hash: b256,
    epoch: u64
}
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// EVENT TYPES
// ----------------------------------------------------------------------------
struct CommitmentSubmitted {
    account: Identity,
    epoch: u64,
    hash: b256
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
    CommitmentHashNotMatching: ()
}
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// ABI
// ----------------------------------------------------------------------------
abi Space {
    #[storage(write,read)]
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
    commitments: StorageMap<Identity, Commitment> = StorageMap {},
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
fn _epoch() -> (u64, bool) {

    let epochDuration = COMMIT_PHASE_DURATION + REVEAL_PHASE_DURATION;
    let time = _timestamp();
    let timePassed: Duration = time.duration_since(START_TIME).unwrap();

    // epoch start at 2, this make the hypothetical previous reveal phase's epoch to be 1
    let epoch = timePassed.as_seconds() / (epochDuration.as_seconds()) + 2;
    let commiting = timePassed.as_seconds() - ((epoch - 2) * epochDuration.as_seconds()) < COMMIT_PHASE_DURATION.as_seconds();

    (epoch, commiting)
}

fn _timestamp() -> Time {
    Time::now()
}

fn _checkHash(hashRevealed: b256, actions: Vec<Action>, secret: b256) {

     // TODO reaction
    if hashRevealed == 0x0000000000000000000000000000000000000000000000000000000000000000 {
        return;
    }
    
    let computedHash = sha256({
        let mut bytes = Bytes::new();
        bytes.append(Bytes::from(encode(hashRevealed)));
        bytes.append(Bytes::from(encode(actions)));
        bytes.append(Bytes::from(encode(secret)));
        bytes
    });

    if hashRevealed != computedHash {
        panic SpaceError::CommitmentHashNotMatching;
    }
}
// ----------------------------------------------------------------------------



// ----------------------------------------------------------------------------
// IMPLEMENTATION
// ----------------------------------------------------------------------------

impl Space for Contract {
    #[storage(write, read)]
    fn commit_actions(hash: b256)  {

        let (epoch, commiting) = _epoch();

        if !commiting {
            panic SpaceError::InRevealPhase;
        }

        let account = msg_sender().unwrap();
        let mut commitment = storage.commitments.get(account).try_read()
            .unwrap_or(Commitment {
                hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
                epoch: 0
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
            hash: hash
        });
    }

    #[storage(write, read)]
    fn reveal_actions(account: Identity, secret: b256, actions: Vec<Action>) {
        let (epoch, commiting) = _epoch();
        if commiting {
            panic SpaceError::InCommitmentPhase;
        }
         let mut commitment = storage.commitments.get(account).try_read()
            .unwrap_or(Commitment {
                hash: 0x0000000000000000000000000000000000000000000000000000000000000000,
                epoch: 0
            });

        if commitment.epoch == 0 {
            panic SpaceError::NothingToReveal;
        }
        if commitment.epoch != epoch {
            panic SpaceError::InvalidEpoch;
        }

        let hashRevealed = commitment.hash;
        _checkHash(hashRevealed, actions, secret);
        

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
fn should_work() {
    let contract_instance = abi(Space, CONTRACT_ID);
  
}
// ----------------------------------------------------------------------------
