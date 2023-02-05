import {mat3, vec3} from 'gl-matrix';
import * as Signal from './signals';
import type {Accessor} from 'solid-js';
import {clamp, TAU} from './util';

const baseCameraDistance = 512;

function rotateXY(target: mat3, x: number, y: number) {
  const sx = Math.sin(x);
  const sy = Math.sin(y);
  const cx = Math.cos(x);
  const cy = Math.cos(y);

  mat3.set(target,
    cx, 0.0, -sx,
    sx * sy, cy, cx * sy,
    sx * cy, -sy, cx * cy,
  );
}

const vertexSource = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

declare global {
  interface ErrorConstructor {
    new (message: string, info: {cause: any}): Error;
    (message: string, info: {cause: any}): Error;
  }
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("failed to compile shader", {cause: info});
  }

  return shader;
}

export default class Renderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private currentFragmentShader: WebGLShader | null = null;
  private currentFragmentShaderSource: string | null = null;
  private _positionLocation: number | null = null;
  private vertexBuffer: WebGLBuffer;
  private vertexData: Float32Array;

  private cameraDirty = true;
  private cameraMatrix: mat3 = mat3.create();
  private cameraOrigin: vec3 = vec3.create();

  constructor(
    canvas: HTMLCanvasElement,
    private time: Accessor<number>,
    private resolution: Accessor<{width: number, height: number}>,
    private mouse: Accessor<{x: number, y: number}>,
  ) {
    // TODO: unless perf problems, right?
    const gl = canvas.getContext('webgl2', { antialias: false });
    if (!gl) {
      throw new Error("failed to create webgl2 context");
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));

    const left = -0.5 * canvas.width;
    const right = 0.5 * canvas.width;
    const top = 0.5 * canvas.height;
    const bottom = -0.5 * canvas.height;

    const vertexBuffer = gl.createBuffer()!;
    const vertexData = new Float32Array(6 * 3);
    vertexData[0]  = left;  vertexData[1]  = top;    vertexData[2]  = 0;
    vertexData[3]  = right; vertexData[4]  = top;    vertexData[5]  = 0;
    vertexData[6]  = right; vertexData[7]  = bottom; vertexData[8]  = 0;
    vertexData[9]  = right; vertexData[10] = bottom; vertexData[11] = 0;
    vertexData[12] = left;  vertexData[13] = top;    vertexData[14] = 0;
    vertexData[15] = left;  vertexData[16] = bottom; vertexData[17] = 0;

    this.gl = gl;
    this.program = program;
    this.vertexBuffer = vertexBuffer;
    this.vertexData = vertexData;
  }

  private get positionLocation(): number {
    if (this._positionLocation == null) {
      const {gl, program} = this;
      this._positionLocation = gl.getAttribLocation(program, "position");
    }
    return this._positionLocation;
  }

  private calculateCameraMatrix() {
    // const {x, y} = Signal.get(this.rotation);
    const {x, y} = {x: 0, y: 0};
    rotateXY(this.cameraMatrix, x * TAU, y * TAU);
    const zoom = 0.5;
    vec3.set(this.cameraOrigin, 0, 0, baseCameraDistance * zoom);
    vec3.transformMat3(this.cameraOrigin, this.cameraOrigin, this.cameraMatrix);
    const target = {x: 0, y: 10, z: 0};
    vec3.add(this.cameraOrigin, this.cameraOrigin, [target.x, target.y, target.z]);
    this.cameraDirty = false;
  }

  private setViewport(left: number, bottom: number, width: number, height: number) {
    const {gl, program} = this;
    const uViewport = gl.getUniformLocation(program, "viewport");
    gl.uniform4fv(uViewport, [left, bottom, width, height]);
    gl.viewport(left, bottom, width, height);
  }

  private setSimpleUniforms() {
    const {gl, program} = this;
    const uT = gl.getUniformLocation(program, "t");
    const uLeftEyeTarget = gl.getUniformLocation(program, "left_eye_target");
    const uRightEyeTarget = gl.getUniformLocation(program, "right_eye_target");

    gl.uniform1f(uT, this.time());

    const {x, y} = this.mouse();
    let dist = Math.max(0, Math.sqrt(x*x + y*y)-0.5);
    const scale = 100;
    const leftEyeTarget = [scale * x + 0, scale * y, 100 + scale * dist];
    const rightEyeTarget = [scale * x - 20, scale * y, 100 + scale * dist];

    gl.uniform3fv(uLeftEyeTarget, leftEyeTarget);
    gl.uniform3fv(uRightEyeTarget, rightEyeTarget);
  }

  private drawSingleView() {
    const {gl, program} = this;
    const uCameraMatrix = gl.getUniformLocation(program, "camera_matrix");
    const uCameraOrigin = gl.getUniformLocation(program, "camera_origin");
    if (this.cameraDirty) {
      this.calculateCameraMatrix();
    }
    gl.uniform3fv(uCameraOrigin, this.cameraOrigin);
    gl.uniformMatrix3fv(uCameraMatrix, false, this.cameraMatrix);
    const resolution = this.resolution();
    this.setViewport(0, 0, resolution.width, resolution.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  draw() {
    if (!this.currentFragmentShader) {
      return;
    }
    this.setSimpleUniforms();
    const {gl, vertexBuffer, vertexData, positionLocation} = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);
    this.drawSingleView();
  }

  recompileShader(fragmentShaderSource: string) {
    const { gl, program, currentFragmentShader, currentFragmentShaderSource } = this;

    if (fragmentShaderSource === currentFragmentShaderSource) {
      console.info("skipping shader compilation");
      return;
    }

    if (currentFragmentShader) {
      gl.detachShader(program, currentFragmentShader);
      gl.deleteShader(currentFragmentShader);
    }
    try {
      const startTime = performance.now();
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      this._positionLocation = null;
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw new Error("failed to link shader program", {cause: info});
      }
      gl.useProgram(program);
      this.currentFragmentShader = fragmentShader;
      this.currentFragmentShaderSource = fragmentShaderSource;
      const endTime = performance.now();
      console.log(`spent ${endTime - startTime}ms compiling shader`);
    } catch (e) {
      this.currentFragmentShader = null;
      throw e;
    }
  }
}
