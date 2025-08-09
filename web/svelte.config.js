import adapter from '@sveltejs/adapter-static';
import { execSync } from 'node:child_process';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

let VERSION = `timestamp_${Date.now()}`;
try {
	VERSION = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
		.toString()
		.trim();
	try {
		// This command returns empty string if no changes
		const output = execSync('git status --porcelain', { encoding: 'utf8' });
		if (output.trim().length > 0) {
			VERSION += '-dirty';
			console.warn(`[!] repo has some uncommited changes...`);
		}
	} catch (error) {
		console.error('Error checking git status:', error);
		process.exit(1);
	}
} catch (e) {
	console.error(e);
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		version: {
			name: VERSION
		}
	}
};

export default config;
