import type { EIP1193AddChainParam } from 'eip-1193';
import type { Chain } from 'viem';

export function viemChainInfoToSwitchChainInfo(chainInfo: Chain): EIP1193AddChainParam {
	return {
		chainId: `0x${Number(chainInfo.id).toString(16)}`,
		chainName: chainInfo.name,
		nativeCurrency: chainInfo.nativeCurrency,
		rpcUrls: [...chainInfo.rpcUrls.default.http],
		blockExplorerUrls: chainInfo.blockExplorers?.default?.url
			? [chainInfo.blockExplorers.default.url]
			: undefined
	};
}
