<script lang="ts" generics="ViewState extends any">
	import { onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { WebGLRenderer } from './WebGLRenderer';
	import type { Camera } from './camera';

	interface Props {
		viewState: Readable<ViewState>;
		renderer: WebGLRenderer<ViewState>;
		camera: Camera;
	}

	let { renderer, camera, viewState }: Props = $props();

	function render(time: number) {
		renderer.render(time);
		animationFrameID = requestAnimationFrame(render);
	}

	let animationFrameID: number;
	let unsubscribeFromCamera: () => void;
	let unsubscribeFromViewState: () => void;

	let error: string | undefined = $state(undefined);
	onMount(() => {
		const canvas = document.querySelector('#world-map') as HTMLCanvasElement;

		// prevent selection of text when start dragging on canvas
		// TODO we should actually disable pointer events for all elements in the way
		//   and reenable when dragging on canvas stop
		canvas.onselectstart = () => false;

		// const gl = canvas.getContext('webgl2', {alpha: false});
		const gl = canvas.getContext('webgl2');
		if (!gl) {
			error = `could not create WebGL2 context`;
			throw new Error(error);
		}

		renderer.initialize(canvas, gl);

		camera.start(canvas, renderer);
		unsubscribeFromCamera = camera.subscribe((v) => renderer.updateView(v));

		// const actionHandler = new ActionHandler();
		// camera.onClick = (x, y) => {
		// 	actionHandler.onCellClicked(Math.floor(x), Math.floor(y));
		// };

		unsubscribeFromViewState = viewState.subscribe(($viewState) => {
			renderer.updateState($viewState);
		});

		animationFrameID = requestAnimationFrame(render);

		return () => {
			camera.stop();
			cancelAnimationFrame(animationFrameID);
			unsubscribeFromCamera();
			unsubscribeFromViewState();
		};
	});
</script>

{#if error}
	{error}
{:else}
	<canvas id="world-map"></canvas>
	<div id="canvas-overlay"></div>
{/if}

<style>
	canvas {
		background-color: var(--canvas-bg-color, black);
		position: absolute;
		width: 100%;
		height: 100%;
		pointer-events: auto;
	}

	div {
		position: absolute;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: hidden;
	}
</style>
