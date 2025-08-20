<script lang="ts">
	import ConnectionFlow from '$lib/connection/ConnectionFlow.svelte';
	import TopBar from '$lib/ui/structure/TopBar.svelte';
	import PixiCanvas from '$lib/render/PixiCanvas.svelte';

	// TODO:
	import { viewState } from '$lib/view';
</script>

<main>
	<div class="pointer-events-auto">
		<TopBar />
	</div>
</main>

<ConnectionFlow />

<div class="canvas">
	<PixiCanvas />
</div>

<style>
	main {
		position: absolute;
		z-index: 1;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.canvas {
		pointer-events: none;
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
	}
</style>
