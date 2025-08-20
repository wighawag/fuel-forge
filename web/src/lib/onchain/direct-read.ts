import { get, writable, type Readable } from 'svelte/store';
import type { OnchainState } from './types';

type Camera = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function createDirectReadStore(camera: Readable<Camera>): Readable<OnchainState> {
	let $state: OnchainState = {};
	let $camera: Camera = get(camera);

	const _store = writable<OnchainState>($state, start);
	function set(state: OnchainState) {
		$state = state;
		_store.set($state);
		return $state;
	}

	function hasCameraChanged(oldCamera: Camera, newCamera: Camera) {
		return (
			oldCamera.x !== newCamera.x ||
			oldCamera.y !== newCamera.y ||
			oldCamera.width !== newCamera.width ||
			oldCamera.height !== newCamera.height
		);
	}

	async function fetchState(camera: Camera) {
		// TODO
		await fetch('');
		if (hasCameraChanged($camera, camera)) {
			return;
		}
		// TODO
		set({});
	}

	let unsubscribeFromCamera: (() => void) | undefined;
	function start() {
		unsubscribeFromCamera = camera.subscribe((camera) => {
			const cameraChanged = hasCameraChanged($camera, camera);
			$camera = { ...camera };
			if (cameraChanged) {
				fetchState($camera);
			}
		});

		return stop;
	}

	function stop() {
		if (unsubscribeFromCamera) {
			// TODO set as IDle ?
			set({});
			unsubscribeFromCamera();
			unsubscribeFromCamera = undefined;
		}
	}

	return {
		subscribe: _store.subscribe
	};
}
