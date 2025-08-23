import { launchTestNode, TestAssetId } from 'fuels/test-utils';

import { describe, test, expect } from 'vitest';

import { TestContractFactory } from '../typescript/src/contracts/TestContractFactory';
import { ActionInput } from '../typescript/src/contracts/TestContract';
import { Vec } from '../typescript/src/contracts/common';
import { B256Coder, BigNumberCoder, EnumCoder, NumberCoder, sha256, StructCoder, TupleCoder, VecCoder } from 'fuels';
import { encodeCommitmentData } from './manual-encoder';

// Utility function to calculate epoch information based on contract logic
function calculateEpochInfo(currentTime: number) {
  // Constants from the contract (main.sw)
  const COMMIT_PHASE_DURATION = 22 * 60 * 60; // 22 hours in seconds
  const REVEAL_PHASE_DURATION = 2 * 60 * 60;  // 2 hours in seconds
  const EPOCH_DURATION = COMMIT_PHASE_DURATION + REVEAL_PHASE_DURATION; // 24 hours
  const START_TIME = 0; // Contract starts at time 0
  
  const timePassed = currentTime - START_TIME;
  
  // Calculate current epoch (minimum epoch is 2 as per contract logic)
  const currentEpoch = Math.floor(timePassed / EPOCH_DURATION) + 2;
  
  // Calculate time within current epoch cycle
  const timeInCurrentEpochCycle = timePassed - ((currentEpoch - 2) * EPOCH_DURATION);
  
  // Calculate time left in current epoch
  const timeLeftInEpoch = EPOCH_DURATION - timeInCurrentEpochCycle;
  
  // Determine if we're in commit phase or reveal phase
  const isCommitPhase = timeInCurrentEpochCycle < COMMIT_PHASE_DURATION;
  
  // Calculate time left for commit phase end (when commit phase will end)
  const timeLeftForCommitEnd = isCommitPhase 
    ? COMMIT_PHASE_DURATION - timeInCurrentEpochCycle 
    : 0; // If we're in reveal phase, commit phase has already ended
  
  // Calculate time left for reveal phase end (when reveal phase will end, i.e., epoch end)
  const timeLeftForRevealEnd = timeLeftInEpoch;
  
  return {
    currentEpoch,
    timeLeftInEpoch,
    timeInCurrentEpochCycle,
    isCommitPhase,
    timeLeftInPhase: isCommitPhase 
      ? COMMIT_PHASE_DURATION - timeInCurrentEpochCycle 
      : REVEAL_PHASE_DURATION - (timeInCurrentEpochCycle - COMMIT_PHASE_DURATION),
    timeLeftForCommitEnd,
    timeLeftForRevealEnd
  };
}

describe('Space', () => {
  test('Commiting actions succeed', async () => {
    using testNode = await launchTestNode({
      contractsConfigs: [
        {
          factory: TestContractFactory,
        },
      ],
    });

    const {
      contracts: [contract],
    } = testNode;

    const { waitForResult: getTimeCall1 } = await contract.functions.get_time().call();
    const getTimeResult1 = await getTimeCall1();
    const currentTime = parseInt(getTimeResult1.value.toString());
    const epochInfo = calculateEpochInfo(currentTime);
    if(epochInfo.isCommitPhase === false) {
      const { waitForResult: increaseTimeCall } = await contract.functions.increase_time(epochInfo.timeLeftForRevealEnd).call();
      await increaseTimeCall();
    }

    const { waitForResult: commitActionsCall } = await contract.functions.commit_actions("0x0000000000000000000000000000000000000000000000000000000000000001").call();
    const { gasUsed } = await commitActionsCall();

    console.log({gasUsed});
  });


  test('Commit and Reveal succeeds', async () => {
     
    let actions: Vec<ActionInput> = [];
    actions.push({Activate: { system: 1 }});
    actions.push({SendFleet: { from: 1,
        spaceships: 100,
        destination: {Known: 2}}});
    
      actions.push({SendFleet: { from: 1,
      spaceships: 100,
      destination: {Eventual: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"}}});
    
    const secret = "0x0000000000000000000000000000000000000000000000000000000000000001";

    // Original Fuel Coder approach: non-cannical and not matching Sway's expected hashing
    // const commitmentCoder = new TupleCoder([
    //   new VecCoder(
    //     new EnumCoder('enum', {
    //       Activate: new StructCoder('struct', {
    //         system: new BigNumberCoder('u64')
    //       }),
    //       SendFleet: new StructCoder('struct', {
    //         from: new BigNumberCoder('u64'),
    //         spaceships: new BigNumberCoder('u64'),
    //         destination: new EnumCoder('enum', {
    //           Eventual: new B256Coder(),
    //           Known: new BigNumberCoder('u64'),
    //         })
    //       }),
    //   })),
    //   new B256Coder()
    // ]);

    // const commitmentBytes = commitmentCoder.encode([actions, secret]);
    // const hash = sha256(commitmentBytes);

    // Manual encoding approach (new)
    const commitmentBytes = encodeCommitmentData(actions, secret);
    const hash = sha256(commitmentBytes);

    // Original dummy example 
    // let buffer = new ArrayBuffer(1+1+8);
    // let view = new DataView(buffer);
    // view.setUint8(0, 42); // Enum variant for Activate
    // view.setUint8(1, 1); // system: 1
    // view.setBigUint64(2, 21n, false); // Enum variant for SendFleet
    // const bytes = new Uint8Array(buffer);
    // console.log(bytes)
    // const hash = sha256(bytes);

     using testNode = await launchTestNode({
      contractsConfigs: [
        {
          factory: TestContractFactory,
        },
      ],
    });
    const {
      contracts: [contract],
      wallets: [wallet],
    } = testNode;

    let { waitForResult: getTimeCall1 } = await contract.functions.get_time().call();
    let getTimeResult1 = await getTimeCall1();
    let currentTime = parseInt(getTimeResult1.value.toString());
    let epochInfo = calculateEpochInfo(currentTime);
    if(epochInfo.isCommitPhase === false) {
      const { waitForResult: increaseTimeCall } = await contract.functions.increase_time(epochInfo.timeLeftForRevealEnd).call();
      await increaseTimeCall();
      const res = await contract.functions.get_time().call();
      getTimeCall1 = res.waitForResult;
      getTimeResult1 = await getTimeCall1();
      currentTime = parseInt(getTimeResult1.value.toString());
      epochInfo = calculateEpochInfo(currentTime);
    }
    const timeLeftForCommitEnd = epochInfo.timeLeftForCommitEnd;

    console.log({epochInfo});

    console.log({time1: getTimeResult1.value.toString()});

    

    const { waitForResult: commitActionsCall } = await contract.functions.commit_actions(hash).call();
    const commitActionsResult = await commitActionsCall();

    console.log(commitActionsResult.logs.map(v => JSON.stringify(v)));
    
    const { waitForResult: increaseTimeCall } = await contract.functions.increase_time(timeLeftForCommitEnd).call();
    const increaseTimeResult = await increaseTimeCall();

    // console.log({increaseTimeResult});

    const { waitForResult: getTimeCall2 } = await contract.functions.get_time().call();
    const getTimeResult2 = await getTimeCall2();

    console.log({time2: getTimeResult2.value.toString()});

    const currentTime2 = parseInt(getTimeResult2.value.toString());
    const epochInfo2 = calculateEpochInfo(currentTime2);

    console.log({epochInfo2});

    const { waitForResult: identityCall } = await contract.functions.identity().call();
    const identityResult = await identityCall();

    // console.log({identityResult});

    const { waitForResult: revealActionsCall } = await contract.functions.reveal_actions(identityResult.value, secret, actions).call();
    const revealActionsResult = await revealActionsCall();

    console.log(revealActionsResult.logs.map(v => JSON.stringify(v)));

  });

});
