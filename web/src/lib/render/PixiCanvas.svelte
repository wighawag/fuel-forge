<script lang="ts">
	import { Viewport } from 'pixi-viewport';
	import { Application, Graphics } from 'pixi.js';
	import { initDevtools } from '@pixi/devtools';
	import { onMount } from 'svelte';

	function buildGrid(graphics: Graphics, witdh: number, height: number, cellSize: number) {
		const numRows = Math.floor(height / cellSize) + 1;
		const numCols = Math.floor(witdh / cellSize) + 1;
		for (let i = 0; i < numCols; i++) {
			graphics.moveTo(i * cellSize, 0).lineTo(i * cellSize, height);
		}

		for (let i = 0; i < numRows; i++) {
			graphics.moveTo(0, i * cellSize).lineTo(witdh, i * cellSize);
		}

		return graphics;
	}

	function buildTriangleMeshGrid(
		graphics: Graphics,
		width: number,
		height: number,
		triangleEdgeSize: number,
		orientation: 'vertical' | 'horizontal' = 'vertical'
	) {
		// Calculate the distance between parallel lines
		// For equilateral triangles, the height is √3/2 times the side length
		const spacing = (Math.sqrt(3) / 2) * triangleEdgeSize;

		// Store the spacing info as properties on the graphics object for scrolling calculations
		(graphics as any).triangleGridInfo = {
			edgeSize: triangleEdgeSize,
			spacing: spacing,
			orientation: orientation
		};

		if (orientation === 'vertical') {
			// Vertical orientation (default) - horizontal base lines

			// Calculate number of lines needed
			const numHorizontalLines = Math.floor(height / spacing) + 2;
			const numDiagonalLines = Math.floor((width + height) / triangleEdgeSize) + 2;

			// Draw horizontal lines
			for (let i = 0; i < numHorizontalLines; i++) {
				const y = i * spacing;
				graphics.moveTo(0, y).lineTo(width, y);
			}

			// Draw diagonal lines going down-right (/)
			for (let i = -numDiagonalLines; i < numDiagonalLines; i++) {
				const startX = i * triangleEdgeSize;
				graphics.moveTo(startX, 0).lineTo(startX + height / Math.sqrt(3), height);
			}

			// Draw diagonal lines going down-left (\)
			for (let i = -numDiagonalLines; i < numDiagonalLines; i++) {
				const startX = i * triangleEdgeSize + width;
				graphics.moveTo(startX, 0).lineTo(startX - height / Math.sqrt(3), height);
			}
		} else {
			// Horizontal orientation - vertical base lines

			// Calculate number of lines needed
			const numVerticalLines = Math.floor(width / spacing) + 2;
			const numDiagonalLines = Math.floor((width + height) / triangleEdgeSize) + 2;

			// Draw vertical lines
			for (let i = 0; i < numVerticalLines; i++) {
				const x = i * spacing;
				graphics.moveTo(x, 0).lineTo(x, height);
			}

			// Draw diagonal lines going down-right (\)
			for (let i = -numDiagonalLines; i < numDiagonalLines; i++) {
				const startY = i * triangleEdgeSize;
				graphics.moveTo(0, startY).lineTo(width, startY + width / Math.sqrt(3));
			}

			// Draw diagonal lines going up-right (/)
			for (let i = -numDiagonalLines; i < numDiagonalLines; i++) {
				const startY = i * triangleEdgeSize + height;
				graphics.moveTo(0, startY).lineTo(width, startY - width / Math.sqrt(3));
			}
		}

		return graphics;
	}

	function buildTriangleMeshPoints(
		graphics: Graphics,
		width: number,
		height: number,
		triangleEdgeSize: number,
		pointSize: number,
		orientation: 'vertical' | 'horizontal' = 'vertical'
	) {
		// Calculate the distance between parallel rows of points
		// For equilateral triangles, the height is √3/2 times the side length
		const spacing = (Math.sqrt(3) / 2) * triangleEdgeSize;

		// Store the spacing info as properties on the graphics object for scrolling calculations
		(graphics as any).triangleGridInfo = {
			edgeSize: triangleEdgeSize,
			spacing: spacing,
			orientation: orientation
		};

		// Calculate the number of points needed in each direction
		// Add extra points to ensure coverage when scrolling
		const extraBuffer = 2;

		if (orientation === 'vertical') {
			// Vertical orientation (triangles with horizontal base)

			// Calculate rows and columns needed
			const numRows = Math.ceil(height / spacing) + extraBuffer;
			const numCols = Math.ceil(width / triangleEdgeSize) + extraBuffer;

			// Draw points at each vertex
			for (let row = -extraBuffer; row < numRows; row++) {
				const y = row * spacing;
				const isEvenRow = row % 2 === 0;

				// In vertical orientation, every other row is offset by half triangleEdgeSize
				for (let col = -extraBuffer; col < numCols + extraBuffer; col++) {
					const x = col * triangleEdgeSize + (isEvenRow ? 0 : triangleEdgeSize / 2);

					// Draw a circle at each point
					graphics.beginFill(0xffffff);
					graphics.drawCircle(x, y, pointSize);
					graphics.endFill();
				}
			}
		} else {
			// Horizontal orientation (triangles with vertical base)

			// Calculate rows and columns needed
			const numCols = Math.ceil(width / spacing) + extraBuffer;
			const numRows = Math.ceil(height / triangleEdgeSize) + extraBuffer;

			// Draw points at each vertex
			for (let col = -extraBuffer; col < numCols; col++) {
				const x = col * spacing;
				const isEvenCol = col % 2 === 0;

				// In horizontal orientation, every other column is offset by half triangleEdgeSize
				for (let row = -extraBuffer; row < numRows + extraBuffer; row++) {
					const y = row * triangleEdgeSize + (isEvenCol ? 0 : triangleEdgeSize / 2);

					// Draw a circle at each point
					graphics.beginFill(0xffffff);
					graphics.drawCircle(x, y, pointSize);
					graphics.endFill();
				}
			}
		}

		return graphics;
	}

	let canvas: HTMLCanvasElement;
	let viewport: Viewport;
	onMount(() => {
		function resizeViewport() {
			viewport && viewport.resize();
		}
		const sizeObserver = new ResizeObserver(resizeViewport);
		sizeObserver.observe(canvas);
		console.log(`Mounting PixiCanvas......`);
		const app = new Application();
		initDevtools({ app });

		let initialised = false;
		const appInitialising = app.init({
			resizeTo: canvas,
			canvas,
			backgroundAlpha: 1,
			backgroundColor: 'black'
		});
		appInitialising.then(() => {
			initialised = true;
			// create viewport
			viewport = new Viewport({
				events: app.renderer.events, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
				allowPreserveDragOutside: true
			});
			viewport.moveCenter(0, 0);

			// add the viewport to the stage
			app.stage.addChild(viewport);

			const minWidth = 10;
			const minHeight = 10;
			const maxWidth = 100;
			const maxHeight = 100;

			// activate plugins
			viewport.drag().pinch().wheel().clampZoom({
				maxWidth,
				maxHeight,
				minHeight,
				minWidth
			});

			viewport.fit(true, 20, 20);

			const cellSize = 10;
			const gridSize = Math.max(maxWidth, maxHeight) + 2 * cellSize;

			const gridPixel = buildTriangleMeshPoints(
				new Graphics(),
				gridSize,
				gridSize,
				cellSize,
				0.2,
				'horizontal' // Change to 'vertical' for vertical orientation
			).stroke({
				color: 0xffffff,
				pixelLine: true,
				width: 1
			});

			viewport.addChild(gridPixel);

			// Listen for animate update
			app.ticker.add((time) => {
				// Just for fun, let's rotate mr rabbit a little.
				// * Delta is 1 if running at 100% performance *
				// * Creates frame-independent transformation *
				// bunny.rotation += 0.1 * time.deltaTime;

				// Apply modulo to create an infinite scrolling grid that follows viewport
				// Get the current viewport position
				const viewportX = viewport.x;
				const viewportY = viewport.y;
				const scale = viewport.scaled;

				const offsetX = viewportX / scale;
				const offsetY = viewportY / scale;

				// Get triangle grid spacing information
				const gridInfo = (gridPixel as any).triangleGridInfo;

				if (gridInfo) {
					// Get grid orientation and spacing
					const orientation = gridInfo.orientation;
					const spacing = gridInfo.spacing;
					const edgeSize = gridInfo.edgeSize;

					// Calculate the period of the pattern (2 triangles make a rhombus)
					const periodX = orientation === 'vertical' ? edgeSize * 2 : spacing * 2;
					const periodY = orientation === 'vertical' ? spacing * 2 : edgeSize * 2;

					// Calculate the repeating offset
					// We use two periods to ensure smooth wrapping and avoid floating point issues
					let gridOffsetX = offsetX % periodX;
					let gridOffsetY = offsetY % periodY;

					// Ensure positive offsets (avoid negative modulo issues)
					if (gridOffsetX < 0) gridOffsetX += periodX;
					if (gridOffsetY < 0) gridOffsetY += periodY;

					// Position grid with calculated offset
					gridPixel.x = -offsetX + gridOffsetX - periodX;
					gridPixel.y = -offsetY + gridOffsetY - periodY;
				} else {
					// Fallback for regular grid
					gridPixel.x = -offsetX - cellSize + (offsetX % cellSize);
					gridPixel.y = -offsetY - cellSize + (offsetY % cellSize);
				}

				gridPixel.alpha = viewport.scaled / 48;
			});
		});

		return () => {
			sizeObserver.disconnect();
			console.log(`Unmounting PixiCanvas...`);
			if (initialised) {
				console.log(`destroying Pixi Application...`);
				app.destroy();
			} else {
				console.log(`unmounting while app was not initialised, waiting for it...`);
				appInitialising.then(() => {
					console.log(`destroying Pixi Application...`);
					app.destroy();
				});
			}
		};
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		background-color: black;
		position: absolute;
		width: 100%;
		height: 100%;
		pointer-events: auto;
	}
</style>
