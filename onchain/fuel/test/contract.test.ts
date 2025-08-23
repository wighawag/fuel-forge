import { launchTestNode, TestAssetId } from 'fuels/test-utils';

import { describe, test, expect } from 'vitest';

import { TestContractFactory } from '../typescript/src/contracts/TestContractFactory';
import { ActionInput } from '../typescript/src/contracts/TestContract';
import { Vec } from '../typescript/src/contracts/common';
import { B256Coder, BigNumberCoder, EnumCoder, NumberCoder, sha256, StructCoder, TupleCoder, VecCoder } from 'fuels';

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

    const commitmentCoder = new TupleCoder([
      new VecCoder(
        new EnumCoder('enum', {
          Activate: new StructCoder('struct', {
            system: new BigNumberCoder('u64')
          }),
          SendFleet: new StructCoder('struct', {
            from: new BigNumberCoder('u64'),
            spaceships: new BigNumberCoder('u64'),
            destination: new EnumCoder('enum', {
              Eventual: new B256Coder(),
              Known: new BigNumberCoder('u64'),
            })
          }),
      })),
      new B256Coder()
    ]);
    const commitmentBytes = commitmentCoder.encode([actions, secret]);
    const hash = sha256(commitmentBytes)


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
    const { waitForResult: commitActionsCall } = await contract.functions.commit_actions(hash).call();
    const commitActionsResult = await commitActionsCall();

    // console.log({commitActionsResult});

    const { waitForResult: getTimeCall1 } = await contract.functions.get_time().call();
    const getTimeResult1 = await getTimeCall1();

    console.log({time1: getTimeResult1.value.toString()});

    const { waitForResult: increaseTimeCall } = await contract.functions.increase_time(22 * 60 * 60).call();
    const increaseTimeResult = await increaseTimeCall();

    // console.log({increaseTimeResult});

    const { waitForResult: getTimeCall2 } = await contract.functions.get_time().call();
    const getTimeResult2 = await getTimeCall2();

    console.log({time2: getTimeResult2.value.toString()});

    const { waitForResult: identityCall } = await contract.functions.identity().call();
    const identityResult = await identityCall();

    // console.log({identityResult});

    const { waitForResult: revealActionsCall } = await contract.functions.reveal_actions(identityResult.value, secret, actions).call();
    await revealActionsCall();

  });

});
