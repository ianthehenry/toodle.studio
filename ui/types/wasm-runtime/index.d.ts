/// <reference types="emscripten" />

declare module 'wasm-runtime' {
  export interface Point {
    x: number,
    y: number,
  }

  export interface Color {
    r: number,
    g: number,
    b: number,
    a: number,
  }

  export interface Line {
    start: Point,
    end: Point,
    color: Color,
    width: number,
  }

  export interface LineVector {
    get: (i: number) => Line,
    size: () => number,
    delete: () => void,
  }

  export type Image = number;
  export type Environment = number;

  export interface CompileResult {
    isError: boolean,
    error: string,
    image: Image,
  }

  export interface StartResult {
    environment: Environment,
    background: Color,
  }

  export interface ContinueResult {
    isError: boolean,
    error: string,
    lines: LineVector,
    background: Color,
  }

  export interface Module extends EmscriptenModule {
    toodle_compile: ((_: string) => CompilationResult);
    toodle_start: ((_: Image) => StartResult);
    toodle_continue: ((_: Environment) => ContinueResult);
    retain_image: ((_: Image) => void);
    release_image: ((_: Image) => void);
    retain_environment: ((_: Environment) => void);
    release_environment: ((_: Environment) => void);
    // TODO
    FS: any;
  }

  const moduleFactory: EmscriptenModuleFactory<Module>;
  export default moduleFactory;
}
