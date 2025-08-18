contract;

use std::time::*;
use std::logging::log;

enum Destination {
    Hidden: b256,
    ClosedBy: u64,
}

struct Move {
    from: u64,
    spaceships: u64,
    destination: Destination
}

struct Fleet {
    id: u64,
    from: u64,
    spaceships: u64,
    destination: u64
}

struct Commitment {
    hash: b256,
    epoch: u64
}

struct CommitmentSubmitted {
    account: Identity,
    epoch: u64,
    hash: b256
}

const COMMIT_PHASE_DURATION: Duration = Duration::seconds(22 * 60 * 60); // 22 hour
const REVEAL_PHASE_DURATION: Duration = Duration::seconds(2 * 60 * 60); // 2 hour
const START_TIME: Time = Time::new(0);

abi Space {
    #[storage(write,read)]
    fn commit_moves(hash: b256);

    // #[storage(write, read)]
    // fn reveal_moves(secret: b256, Move[] moves);

    // #[storage(write, read)]
    // fn reveal_arrivals(Fleet[]);
}

storage {
    commitments: StorageMap<Identity, Commitment> = StorageMap {},
}

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


#[error_type]
pub enum SpaceError {
    #[error(m = "Not Commit Allowed in Reveal Phase")]
    InRevealPhase: (),
    #[error(m = "Previous commitment need to be revealed before committing again")]
    PreviousCommitmentNotRevealed: ()
}

impl Space for Contract {
    #[storage(write, read)]
    fn commit_moves(hash: b256)  {

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


    
}

#[test]
fn should_work() {
    let contract_instance = abi(Space, CONTRACT_ID);
  
}
