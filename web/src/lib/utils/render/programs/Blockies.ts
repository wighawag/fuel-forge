import * as twgl from 'twgl.js';
import { Blockie } from '$lib/utils/ethereum/blockie';

type Attributes = {
	positions: { data: Float32Array; nextIndex: number };
	colors: { data: Float32Array; nextIndex: number };
};

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec3 a_color;

uniform mat3 u_matrix;

out vec3 v_color; 

void main() {
  v_color = a_color;
  gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 v_color; 

out vec4 outColor;

void main() {
	outColor = vec4(v_color, 1.0);
}
`;

export class BlockiesProgram {
	programInfo!: twgl.ProgramInfo;
	bufferInfo!: twgl.BufferInfo;
	gl!: WebGL2RenderingContext;
	attributes!: Attributes;

	constructor(
		public size: number,
		public tileSize: number
	) {}

	initialize(GL: WebGL2RenderingContext) {
		this.gl = GL;
		this.programInfo = twgl.createProgramInfo(GL, [vertexShaderSource, fragmentShaderSource]);

		const attributes = {
			a_position: { numComponents: 2, data: new Float32Array([]) },
			a_color: { numComponents: 3, data: new Float32Array([]) }
		};
		this.bufferInfo = twgl.createBufferInfoFromArrays(GL, attributes);

		this.attributes = {
			positions: { data: new Float32Array(2000000), nextIndex: 0 },
			colors: { data: new Float32Array(2000000), nextIndex: 0 }
		};
	}

	use() {
		const GL = this.gl;
		GL.useProgram(this.programInfo.program);
	}

	drawBlockie(x: number, y: number, address: string) {
		const blockie = Blockie.get(address);
		const data = blockie.imageData;

		const blockieSize = this.tileSize * 2;

		const x1 = x + this.size / 2 - blockieSize / 4;
		const y1 = y + this.size - blockieSize + this.tileSize / 2;
		// const x2 = x1 + tileSize;
		// const y2 = y1 + tileSize;

		let i = 0;
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				const l = x1 + (x * blockieSize) / 16;
				const r = l + blockieSize / 16;
				const t = y1 + (y * blockieSize) / 16;
				const b = t + blockieSize / 16;

				{
					let i = this.attributes.positions.nextIndex;
					this.attributes.positions.data[i++] = l;
					this.attributes.positions.data[i++] = t;
					this.attributes.positions.data[i++] = r;
					this.attributes.positions.data[i++] = t;
					this.attributes.positions.data[i++] = l;
					this.attributes.positions.data[i++] = b;
					this.attributes.positions.data[i++] = l;
					this.attributes.positions.data[i++] = b;
					this.attributes.positions.data[i++] = r;
					this.attributes.positions.data[i++] = t;
					this.attributes.positions.data[i++] = r;
					this.attributes.positions.data[i++] = b;
					this.attributes.positions.nextIndex = i;
				}

				let rgb = blockie.bgcolorRGB;
				if (data[i] === 1) {
					rgb = blockie.colorRGB;
				} else if (data[i] === 2) {
					rgb = blockie.spotcolorRGB;
				}
				{
					let ni = this.attributes.colors.nextIndex;
					for (let i = 0; i < 6; i++) {
						for (let c of rgb) {
							this.attributes.colors.data[ni++] = c;
						}
					}
					this.attributes.colors.nextIndex = ni;
				}
				i++;
			}
		}
	}
}
