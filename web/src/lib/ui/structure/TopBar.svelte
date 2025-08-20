<script lang="ts">
	import { connection } from '$lib/connection';
	import ImgBlockie from '$lib/ui/ethereum/ImgBlockie.svelte';
	import Button from '../generic/Button.svelte';
	import Spinner from '../generic/Spinner.svelte';

	let showMenu = $state(false);

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function closeMenu(event: Event) {
		// Only close if the click is on the panel background itself
		if (event.target === event.currentTarget) {
			showMenu = false;
		}
	}
</script>

<nav
	class="fixed left-0 top-0 z-50 flex h-12 w-full items-center justify-between bg-gray-900 px-4 text-white shadow-md"
>
	<div class="flex h-full items-center space-x-2">
		<!-- Logo or App Name -->
		<span class="text-lg font-bold">DGame</span>
	</div>
	<div class="relative flex h-full items-center space-x-4">
		{#if $connection.step === 'Idle' && $connection.loading}
			<Button disabled class="m-0 flex h-8 w-8 items-center justify-center p-0">
				<Spinner class="h-6 w-6" />
			</Button>
		{:else if $connection.step === 'SignedIn'}
			<div class="flex h-full items-center space-x-2">
				<button
					class="flex h-8 w-8 items-center justify-center focus:outline-none"
					onclick={toggleMenu}
					aria-label="Account menu"
				>
					<ImgBlockie
						address={$connection.account.address}
						class="h-6 w-6 rounded-full border border-gray-700"
					/>
				</button>
			</div>
		{:else}
			<!-- disabled={$connection.step != 'Idle'} -->
			<Button
				class="m-0 flex h-8 items-center justify-center p-0 px-3"
				onclick={() => connection.connect()}
			>
				Connect
			</Button>
		{/if}
	</div>
	{#if showMenu}
		<div
			class="absolute right-4 top-12 z-[100] mt-2 w-64 rounded-lg border border-gray-700 bg-gray-800 shadow-lg transition-transform duration-200"
			onclick={closeMenu}
			onkeydown={(event) => {
				if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
					closeMenu(event);
				}
			}}
			tabindex="0"
			role="dialog"
			aria-modal="true"
		>
			{#if $connection.step === 'SignedIn'}
				<div class="p-4">
					<div class="mb-2 text-xs text-gray-400">Connected as:</div>
					<div class="mb-4 break-all font-mono text-sm text-white">
						{$connection.account.address}
					</div>
					<Button
						class="w-full"
						onclick={() => {
							connection.disconnect();
							showMenu = false;
						}}
					>
						Disconnect
					</Button>
				</div>
			{:else}
				<div class="p-4 text-center text-gray-400">
					Please connect your wallet to access account details.
				</div>
			{/if}
		</div>
	{/if}
</nav>
