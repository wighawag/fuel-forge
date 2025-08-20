import {
	writable,
	type Readable,
	type Subscriber,
	type Unsubscriber,
	type Writable
} from 'svelte/store';
import * as twgl from 'twgl.js';
import type { CameraState } from './camera';
import type { RenderViewState } from './renderview';

export class WebGLRenderer<State extends any> implements Readable<RenderViewState> {
	protected state!: State;
	protected canvas!: HTMLCanvasElement;
	protected gl!: WebGL2RenderingContext;
	protected cameraState!: CameraState;
	protected store: Writable<RenderViewState>;

	constructor() {
		this.store = writable({ devicePixelRatio: 1, width: 0, height: 0 });
	}

	subscribe(
		run: Subscriber<RenderViewState>,
		invalidate?: (value?: RenderViewState) => void
	): Unsubscriber {
		return this.store.subscribe(run, invalidate);
	}
	updateState(state: State) {
		this.state = state;
	}
	updateView(cameraState: CameraState) {
		this.cameraState = cameraState;
	}

	initialize(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
		this.canvas = canvas;
		this.gl = gl;
		this.store.set({
			devicePixelRatio: window.devicePixelRatio,
			width: this.canvas.width,
			height: this.canvas.height
		});
	}

	render(time: number) {
		const GL = this.gl;
		const devicePixelRatio = 1; // window.devicePixelRatio;

		if (twgl.resizeCanvasToDisplaySize(this.canvas, devicePixelRatio)) {
			this.store.set({
				devicePixelRatio,
				width: this.canvas.width,
				height: this.canvas.height
			});
		}
		GL.viewport(0, 0, this.canvas.width, this.canvas.height);

		GL.clearColor(0, 0, 0, 0);
		GL.clear(GL.COLOR_BUFFER_BIT);
	}
}
