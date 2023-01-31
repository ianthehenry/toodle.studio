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
  }

  export interface EvaluationResult {
    isError: boolean,
    error: string,
    environment: number,
  }

  export interface RunResult {
    isError: boolean,
    error: string,
    lines: LineVector,
  }

  export interface Module extends EmscriptenModule {
    evaluate_script: ((_: string) => EvaluationResult);
    run_doodles: ((_: number) => RunResult);
    free_environment: ((_: number) => void);
    // TODO, obviosly
    FS: WhyDoesTypescriptAllowGarbageHere;
  }

  const moduleFactory: EmscriptenModuleFactory<Module>;
  export default moduleFactory;
}
