<script lang="ts">
	import Button from '$lib/ui/generic/Button.svelte';
	import type { BN } from 'fuels';
	import { Provider, Wallet, WalletUnlocked } from 'fuels';
	import { PUBLIC_FUEL_NODE_URL } from '$env/static/public';
	import { connectToFuel } from '$lib/index.js';

	let error: string | undefined = $state(undefined);

	async function increment() {
		console.log('Incrementing...');
		const provider = new Provider(PUBLIC_FUEL_NODE_URL);
		const wallet: WalletUnlocked = Wallet.fromPrivateKey('0x', provider);

		const balance: BN = await wallet.getBalance(await provider.getBaseAssetId());
		console.log('Current balance:', balance.toString());
	}

	let value: Awaited<ReturnType<typeof connectToFuel>> | undefined = $state(undefined);

	async function connect() {
		value = await connectToFuel();
	}
</script>

<!-- <Button onclick={increment}>increment</Button> -->

{#if value}
	<p>Connected to Fuel: (chainId: {value.chainId})</p>
{:else}
	<p>Not connected to Fuel</p>
{/if}

<Button onclick={connect}>connect</Button>
