import { launchTestNode, TestAssetId } from 'fuels/test-utils';

import { describe, test, expect } from 'vitest';

import { TestContractFactory } from '../typescript/src/contracts/TestContractFactory';

describe('Calling contract methods', () => {
  test('Call non-payable method', async () => {
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
    const { value: callInfo } = await commitActionsCall();

    console.log(callInfo);
  });

});
