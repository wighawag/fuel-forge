import { Provider } from 'fuels';

export async function connectToFuel() {
	const NETWORK_URL = 'https://mainnet.fuel.network/v1/graphql';

	const provider = new Provider(NETWORK_URL);

	const baseAssetId = await provider.getBaseAssetId();
	const chainId = await provider.getChainId();
	const gasConfig = await provider.getGasConfig();

	return { baseAssetId, chainId, gasConfig, provider };
}
