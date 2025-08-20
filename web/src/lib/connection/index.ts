import { PUBLIC_WALLET_HOST } from '$env/static/public';
import { createConnection } from '@etherplay/connect';
import type { Methods } from 'eip-1193';
// import contracts from '$lib/contracts';
import { viemChainInfoToSwitchChainInfo } from '$lib/utils/ethereum/chains';

export const chainId = '1'; //contracts.chainId;
export const chainInfo = { rpcUrls: { default: { http: [''] } } }; //contracts.chainInfo;
// export const switchChainInfo = viemChainInfoToSwitchChainInfo(chainInfo);
export const connection = createConnection({
	walletHost: PUBLIC_WALLET_HOST,
	node: {
		chainId,
		url: chainInfo.rpcUrls.default.http[0],
		prioritizeWalletProvider: false
	},
	// alwaysUseCurrentAccount: true,
	autoConnect: true,
	requestSignatureAutomaticallyIfPossible: true
});

(globalThis as any).connection = connection;
