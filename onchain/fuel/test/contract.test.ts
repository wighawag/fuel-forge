import { launchTestNode, TestAssetId } from 'fuels/test-utils';

import { describe, test, expect } from 'vitest';

import { TestContractFactory } from '../typescript/src/contracts/TestContractFactory';
import { ActionInput } from '../typescript/src/contracts/TestContract';
import { Vec } from '../typescript/src/contracts/common';
import { V } from 'vitest/dist/chunks/reporters.d.BFLkQcL6.js';

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
    
    let secret = 0x0000000000000000000000000000000000000000000000000000000000000001;
    
    // let hash = _hash_actions(actions, secret);
    // caller.commit_actions(hash);

    // caller.increase_time(COMMIT_PHASE_DURATION.as_seconds());

    // caller.reveal_actions(identity, secret, actions);
  });

});
