import { writable } from 'svelte/store';

export type ViewState = {};

export const viewState = writable<ViewState>({});
