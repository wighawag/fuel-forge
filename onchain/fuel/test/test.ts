import { CounterFactory } from './typescript/src/';
 
using launchedContractNode = await launchTestNode({
  contractsConfigs: [CounterFactory],
});
 
const {
  contracts: [contract],
  provider,
  wallets,
} = launchedContractNode;
 
const { waitForResult } = await contract.functions.get_count().call();
const response = await waitForResult();