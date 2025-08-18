<script lang="ts">
	import Button from '$lib/ui/generic/Button.svelte';
	import type { BN } from 'fuels';
	import { Provider, Wallet, WalletUnlocked } from 'fuels';
	import { PUBLIC_FUEL_NODE_URL } from '$env/static/public';

	let error: string | undefined = $state(undefined);

	async function increment() {
		console.log('Incrementing...');
		const provider = new Provider(PUBLIC_FUEL_NODE_URL);
		const wallet: WalletUnlocked = Wallet.fromPrivateKey('0x', provider);

		const balance: BN = await wallet.getBalance(await provider.getBaseAssetId());
		console.log('Current balance:', balance.toString());
	}
</script>

<Button onclick={increment}>increment</Button>
