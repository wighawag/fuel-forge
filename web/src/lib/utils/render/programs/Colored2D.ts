import * as twgl from 'twgl.js';

const vertexShaderSource = `#version 300 es
     
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
 
uniform mat3 u_matrix;

void main() {
	// Multiply the position by the matrix.
  gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);
}
`;

const fragmentShaderSource = `#version 300 es
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
	// Just set the output to a constant reddish-purple
	outColor = u_color;
}
`;

export class Colored2DProgram {
	programInfo!: twgl.ProgramInfo;
	bufferInfo!: twgl.BufferInfo;
	gl!: WebGL2RenderingContext;

	constructor(
		public size: number,
		public tickness: number
	) {}

	initialize(GL: WebGL2RenderingContext) {
		this.gl = GL;
		this.programInfo = twgl.createProgramInfo(GL, [vertexShaderSource, fragmentShaderSource]);

		const attributes = {
			a_position: { numComponents: 2, data: new Float32Array([]) }
		};
		this.bufferInfo = twgl.createBufferInfoFromArrays(GL, attributes);
	}

	use() {
		this.gl.useProgram(this.programInfo.program);
	}
}
