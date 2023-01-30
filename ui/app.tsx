import type {Component, JSX} from 'solid-js';
import {batch, createMemo, createSelector, onMount, For, Switch, Match} from 'solid-js';
import {Timer, LoopMode, TimerState} from './timer';
import installCodeMirror from './editor';
import {EditorView} from '@codemirror/view';
import * as Signal from './signals';
import {mod, clamp} from './util';
import {vec2} from 'gl-matrix';
import type {Seconds} from './types';
import type {Module, Line, Point, Color, LineVector} from 'wasm-runtime';
import OutputChannel from './output-channel';
import RenderLoop from './render-loop';
import type {Property} from 'csstype';

enum EvaluationState {
  Unknown,
  Success,
  EvaluationError,
  ShaderCompilationError,
}
const Icon: Component<{name: string}> = (props) => {
  return <svg><use href={`/icons.svg#${props.name}`} /></svg>;
};

interface ChoiceDescription<T> {
  title: string,
  value: T,
  icon: string,
}

function choices<T extends number | string>(
  signal: Signal.T<T>,
  choices: ChoiceDescription<T>[]
): JSX.Element {
  const isSelected = createSelector(Signal.getter(signal));
  const setter = Signal.setter(signal);

  return <fieldset>
    <For each={choices}>{ ({title, value, icon}) =>
      <label title={title}>
        <input
          type="radio"
          autocomplete="off"
          value={value}
          checked={isSelected(value)}
          onChange={[setter, value]} />
        <Icon name={icon} />
      </label>
    }</For>
  </fieldset>;
}

const EditorToolbar: Component<{state: EvaluationState}> = (props) => {
  return <div class="toolbar">
    <div class="spacer"></div>
    <Switch>
      <Match when={props.state === EvaluationState.Unknown}>
        <div title="Compilation unknown" class="indicator compilation-unknown">
          <Icon name="emoji-neutral" />
        </div>
      </Match>
      <Match when={props.state === EvaluationState.Success}>
        <div title="Compilation success" class="indicator compilation-success">
          <Icon name="emoji-smile" />
        </div>
      </Match>
      <Match when={props.state === EvaluationState.EvaluationError}>
        <div title="Compilation error" class="indicator compilation-error">
          <Icon name="emoji-frown" />
        </div>
      </Match>
      <Match when={props.state === EvaluationState.ShaderCompilationError}>
        <div title="Shader compilation error" class="indicator compilation-error">
          <Icon name="emoji-angry" />
        </div>
      </Match>
    </Switch>
  </div>;
};

const timestampInput = (signal: Signal.T<Seconds>): JSX.Element => {
  return <input
    inputmode="numeric"
    value={Signal.get(signal).toFixed(2)}
    autocomplete="off"
    onChange={(e) => {
      Signal.set(signal, parseInt(e.currentTarget.value, 10) as Seconds);
    }} />;
};

interface AnimationToolbarProps {
  timer: Timer,
}
const AnimationToolbar: Component<AnimationToolbarProps> = (props) => {
  return <div class="toolbar">
    <button
      title={Signal.get(props.timer.state) === TimerState.Playing ? "Pause" : "Play"}
      onClick={() => props.timer.playPause()}>
      <Icon name={Signal.get(props.timer.state) === TimerState.Playing ? "pause" : "play"} />
    </button>
    <button title="Stop" onClick={() => props.timer.stop()}><Icon name="stop" /></button>
    <span title="Current timestamp" class="timestamp">{Signal.get(props.timer.t).toFixed(2)}</span>
    <div class="spacer"></div>
    {/* <div class="scrubber"></div>*/}
    {choices(props.timer.loopMode, [
      { value: LoopMode.NoLoop, icon: "arrow-bar-right", title: "No loop" },
      { value: LoopMode.Wrap, icon: "repeat", title: "Loop" },
      { value: LoopMode.Reverse, icon: "arrow-left-right", title: "Loop back and forth" },
    ])}
    {timestampInput(props.timer.loopStart)}
    <span class="text">to</span>
    {timestampInput(props.timer.loopEnd)}
  </div>;
};

// TODO: what is the correct way to write this type?
const ResizableArea = (props: {ref: any}) => {
  let outputContainer: HTMLPreElement;
  let handlePointerAt = 0;
  onMount(() => props.ref(outputContainer as HTMLElement));
  return <>
    <div class="resize-handle output-resize-handle"
      title="double click to auto size"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        handlePointerAt = e.screenY;
      }}
      onDblClick={() => {
        outputContainer.style.flexBasis = null!;
        outputContainer.style.maxHeight = null!;
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
          return;
        }
        const outputStyle = getComputedStyle(outputContainer);
        const verticalPadding = parseFloat(outputStyle.paddingTop) + parseFloat(outputStyle.paddingBottom);
        const oldHeight = outputContainer.offsetHeight - verticalPadding;
        const oldScrollTop = outputContainer.scrollTop;
        const handlePointerWasAt = handlePointerAt;
        handlePointerAt = e.screenY;
        const delta = handlePointerAt - handlePointerWasAt;
        outputContainer.style.flexBasis = `${oldHeight - delta}px`;
        outputContainer.style.maxHeight = '100%';
        outputContainer.scrollTop = clamp(oldScrollTop + delta, 0, outputContainer.scrollHeight - outputContainer.offsetHeight);
      }}
    />
    <pre class="output-container" ref={outputContainer!} />
  </>;
};

const colorToString = ({r, g, b, a}: Color) => `rgba(${255 * r}, ${255 * g}, ${255 * b}, ${a})`;

function drawLines(ctx: CanvasRenderingContext2D, origin: Point, lines: LineVector, pixelRatio: number) {
  ctx.lineCap = 'round';
  for (let i = 0; i < lines.size(); i++) {
    const {start, end, width, color} = lines.get(i);
    ctx.beginPath();
    ctx.moveTo(origin.x + start.x, origin.y - start.y);
    ctx.lineTo(origin.x + end.x, origin.y - end.y);
    ctx.lineWidth = width * pixelRatio;
    ctx.strokeStyle = colorToString(color);
    ctx.stroke();
  }
}

interface Props {
  initialScript: string,
  focusable: boolean,
  canSave: boolean,
  runtime: Module,
  outputChannel: OutputChannel,
  size: {width: number, height: number},
}

const App = (props: Props) => {
  const {runtime, outputChannel} = props;
  let canvasContainer: HTMLDivElement;
  let editorContainer: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let editor: EditorView;
  let outputContainer: HTMLElement;

  let isGesturing = false;
  let gestureEndedAt = 0;

  const canvasSize = Signal.create(props.size);
  const pixelRatio = Signal.create(window.devicePixelRatio);
  const imageRendering: Signal.T<Property.ImageRendering> = Signal.create('auto');
  const canvasResolution = createMemo(() => {
    const dpr = Signal.get(pixelRatio);
    const size = Signal.get(canvasSize);
    return {width: dpr * size.width, height: dpr * size.height};
  });

  const scriptDirty = Signal.create(true);
  const evaluationState = Signal.create(EvaluationState.Unknown);
  const isVisible = Signal.create(false);

  const timer = new Timer();

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      Signal.set(isVisible, entry.isIntersecting);
    }
  });

  onMount(() => {
    intersectionObserver.observe(canvas);
    editor = installCodeMirror({
      initialScript: props.initialScript,
      parent: editorContainer,
      canSave: props.canSave,
      onChange: () => Signal.set(scriptDirty, true),
    });

    const ctx = canvas.getContext('2d')!;

    let currentEnvironment: number | null = null;
    let nextEnvironment: number | null = null;

    const renderLoop = new RenderLoop((elapsed) => batch(() => {
      if (!Signal.get(isVisible)) {
        return;
      }
      const isTimeAdvancing = Signal.get(timer.state) !== TimerState.Paused;
      if (isTimeAdvancing) {
        // If you hit the stop button, we want to redraw at zero,
        // but we don't want to advance time forward by 16ms.
        timer.tick(elapsed, true);
        // Normally the advancing of time is sufficient
        // to reschedule the loop, but if you're just
        // resuming after a stop the initial elapsed time
        // is 0.
        if (elapsed === 0) {
          renderLoop.schedule();
        }
      }

      if (Signal.get(scriptDirty)) {
        outputContainer.innerHTML = '';
        outputChannel.target = outputContainer;
        const result = runtime.evaluate_script(editor.state.doc.toString());
        Signal.set(scriptDirty, false);

        if (nextEnvironment != null && currentEnvironment != nextEnvironment) {
          runtime.free_environment(nextEnvironment);
        }
        if (result.isError) {
          nextEnvironment = null;
          Signal.set(evaluationState, EvaluationState.EvaluationError);
          console.error(result.error);
        } else {
          nextEnvironment = result.environment;
        }
        outputChannel.target = null;
      }

      if (true) {
        if (currentEnvironment != null) {
          runtime.free_environment(currentEnvironment);
        }
        currentEnvironment = nextEnvironment;
      }

      if (currentEnvironment != null) {
        const resolution = canvasResolution();
        const origin = {x: resolution.width * 0.5, y: resolution.height * 0.5};
        const result = runtime.run_turtles(currentEnvironment);
        if (result.isError) {
          Signal.set(evaluationState, EvaluationState.EvaluationError);
          console.error(result.error);
          currentEnvironment = null;
        } else {
          drawLines(ctx, origin, result.lines, Signal.get(pixelRatio));
        }
      }

    }));

    Signal.onEffect([
      isVisible,
      scriptDirty,
      timer.state,
      timer.t,
      canvasResolution,
    ] as Signal.T<any>[], () => {
      renderLoop.schedule();
    });
  });

  let codeContainer: HTMLDivElement;
  let handlePointerAt = [0, 0];
  const onHandlePointerDown = (e: PointerEvent & {currentTarget: HTMLDivElement}) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerAt = [e.screenX, e.screenY];
  };
  const onHandleDblClick = () => {
    // TODO: width or height!
    codeContainer.style.flexBasis = `var(--canvas-width)`;
    canvasContainer.style.flexBasis = 'var(--canvas-width)';
  };
  const onHandlePointerMove = (e: PointerEvent & {currentTarget: HTMLDivElement}) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
      return;
    }
    const isVertical = getComputedStyle(e.currentTarget.parentElement!).flexDirection === 'column';
    const containerStyle = getComputedStyle(canvasContainer);

    const padding = isVertical
      ? parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom)
      : parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    const oldSize = (isVertical ? canvasContainer.offsetHeight : canvasContainer.offsetWidth) - padding;

    const handlePointerWasAt = handlePointerAt;
    handlePointerAt = [e.screenX, e.screenY];
    const delta = isVertical
      ? handlePointerWasAt[1] - handlePointerAt[1]
      : handlePointerAt[0] - handlePointerWasAt[0];
    codeContainer.style.flexBasis = `0`;
    canvasContainer.style.flexBasis = `${oldSize - delta}px`;
  };

  return <div class="bauble" style={{
    '--canvas-width': `${Signal.get(canvasSize).width}px`,
    '--canvas-height': `${Signal.get(canvasSize).height}px`
  }}>
    <div class="canvas-container" ref={canvasContainer!}>
      <canvas
        ref={canvas!}
        class="render-target"
        style={{'image-rendering': Signal.get(imageRendering)}}
        width={canvasResolution().width}
        height={canvasResolution().height}
        tabindex={props.focusable ? 0 : undefined}
      />
      <AnimationToolbar timer={timer} />
    </div>
    <div class="resize-handle canvas-resize-handle"
      title="double click to auto size"
      onPointerDown={onHandlePointerDown}
      onPointerMove={onHandlePointerMove}
      onDblClick={onHandleDblClick}
    />
    <div class="code-container" ref={codeContainer!}>
      <EditorToolbar state={Signal.get(evaluationState)} />
      <div class="editor-container" ref={editorContainer!} />
      <ResizableArea ref={outputContainer!} />
    </div>
  </div>;
};
export default App;
