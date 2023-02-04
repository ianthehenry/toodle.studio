import type {Component, JSX} from 'solid-js';
import {createEffect} from 'solid-js';
import {batch, createMemo, createSelector, onMount, For, Switch, Match} from 'solid-js';
import {Timer, LoopMode, TimerState} from './timer';
import installCodeMirror from './editor';
import {EditorView} from '@codemirror/view';
import * as Signal from './signals';
import {mod, clamp} from './util';
import {vec2} from 'gl-matrix';
import type {Seconds} from './types';
import type {Module, Line, Point, Color, LineVector, Environment, Image} from 'wasm-runtime';
import OutputChannel from './output-channel';
import RenderLoop from './render-loop';
import type {Property} from 'csstype';
import * as Storage from './storage';
import {EditorState, Transaction} from '@codemirror/state';

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
  </div>;
};

// TODO: what is the correct way to write this type?
const ResizableArea = (props: {ref: any}) => {
  let outputContainer: HTMLPreElement;
  let handlePointerAt = 0;
  onMount(() => { props.ref(outputContainer as HTMLElement); });
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
  scripts: [string],
  focusable: boolean,
  canSave: boolean,
  runtime: Module,
  outputChannel: OutputChannel,
  size: {width: number, height: number},
}

interface StateCommandInput {state: EditorState, dispatch: (_: Transaction) => void}
function setContent({dispatch, state}: StateCommandInput, content: string) {
  dispatch(state.update({
    changes: {from: 0, to: state.doc.length, insert: content},
    selection: {anchor: content.length, head: content.length},
  }));
}

const App = (props: Props) => {
  const {runtime, outputChannel} = props;
  let canvasContainer: HTMLDivElement;
  let editorContainer: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let editor: EditorView;
  let evalOutputContainer: HTMLElement;
  let runOutputContainer: HTMLPreElement;
  let ctx: CanvasRenderingContext2D;

  const canvasSize = Signal.create(props.size);
  const pixelRatio = Signal.create(window.devicePixelRatio);
  const imageRendering: Signal.T<Property.ImageRendering> = Signal.create('auto');
  const canvasResolution = createMemo(() => {
    const dpr = Signal.get(pixelRatio);
    const size = Signal.get(canvasSize);
    return {width: dpr * size.width, height: dpr * size.height};
  });

  const scripts = props.scripts;
  const activeScript = Signal.create(scripts[0]!);

  const scriptDirty = Signal.create(true);
  const evaluationState = Signal.create(EvaluationState.Unknown);
  const isVisible = Signal.create(false);

  const timer = new Timer();

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      Signal.set(isVisible, entry.isIntersecting);
    }
  });

  let currentImage: Image | null = null;
  let nextImage: Image | null = null;
  let currentEnvironment: Environment | null = null;

  function loadNext() {
    if (nextImage != null) {
      if (currentImage != null) {
        runtime.release_image(currentImage);
      }
      if (currentEnvironment != null) {
        runtime.release_environment(currentEnvironment);
      }

      currentImage = nextImage;
      currentEnvironment = null;
      runtime.retain_image(currentImage);
      runOutputContainer.innerHTML = '';
    }
  }

  function restart() {
    ctx.fillStyle = '#1d1f21';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (currentImage != null) {
      currentEnvironment = runtime.toodle_start(currentImage).environment;
    }
  }

  // activeScript

  function save(scriptName: string, text: string) {
    if (text.trim().length > 0) {
      Storage.saveScript(scriptName, text);
    } else {
      Storage.deleteScript(scriptName);
    }
  }

  onMount(() => {
    intersectionObserver.observe(canvas);
    editor = installCodeMirror({
      parent: editorContainer,
      save: (text) => {
        save(Signal.get(activeScript), text);
      },
      onChange: () => Signal.set(scriptDirty, true),
    });

    createEffect((oldScriptName: string | undefined) => {
      if (oldScriptName != null) {
        save(oldScriptName, editor.state.doc.toString());
      }
      const scriptName = Signal.get(activeScript);
      const text = Storage.getScript(scriptName) ?? runtime.FS.readFile(`/examples/${scriptName}.janet`, {encoding: 'utf8'});
      setContent(editor, text);
      return scriptName;
    });

    ctx = canvas.getContext('2d')!;

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
        evalOutputContainer.innerHTML = '';
        outputChannel.target = evalOutputContainer;
        const result = runtime.toodle_compile(editor.state.doc.toString());
        Signal.set(scriptDirty, false);

        if (nextImage != null) {
          runtime.release_image(nextImage);
        }
        if (result.isError) {
          nextImage = null;
          Signal.set(evaluationState, EvaluationState.EvaluationError);
          console.error(result.error);
        } else {
          nextImage = result.image;
        }
        outputChannel.target = null;
      }

      if (currentImage == null && nextImage != null) {
        loadNext();
      }
      if (currentEnvironment == null) {
        restart();
      }

      if (currentEnvironment != null) {
        const resolution = canvasResolution();
        const origin = {x: resolution.width * 0.5, y: resolution.height * 0.5};
        outputChannel.target = runOutputContainer;
        const result = runtime.toodle_continue(currentEnvironment);
        if (result.isError) {
          Signal.set(evaluationState, EvaluationState.EvaluationError);
          console.error(result.error);
          currentEnvironment = null;
        } else {
          drawLines(ctx, origin, result.lines, Signal.get(pixelRatio));
          // TODO: fade, maybe
          // ctx.fillStyle = '#1d1f210a';
          // ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    '--canvas-height': `${Signal.get(canvasSize).height}px`,
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
      <pre class="runtime-output-container" ref={runOutputContainer!}></pre>
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
      <ResizableArea ref={evalOutputContainer!} />
    </div>
    <div class="sidebar">
      <img id="logo" src="/logo.png" width="170" height="170" />
      <ul class="file-select">
        <For each={scripts}>{(script) =>
          <li
            onClick={() => Signal.set(activeScript, script)}
            class={Signal.get(activeScript) === script ? "selected" : ""}>
            {script}
          </li>
        }</For>
      </ul>
    </div>
  </div>;
};
export default App;
