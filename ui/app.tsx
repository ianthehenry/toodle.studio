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
import logoShader from './logo-shader';
import Renderer from './renderer';
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

interface EditorToolbarProps {
  state: EvaluationState,
  loadEnabled: boolean,
  onClickLoad: () => void,
}

const EditorToolbar: Component<EditorToolbarProps> = (props) => {
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
    <button
      title={
        "Load Program\n" +
        (window.navigator.platform.startsWith('Mac') ?
        "⌘ Enter" : "Ctrl-Enter")}
      disabled={!props.loadEnabled}
      onClick={props.onClickLoad}>
      <Icon name="box-arrow-right" />
    </button>
  </div>;
};

interface AnimationToolbarProps {
  timer: Timer,
  restartEnabled: boolean,
  onRestart: () => void,
}
const AnimationToolbar: Component<AnimationToolbarProps> = (props) => {
  return <div class="toolbar">
    <button
      title="Restart"
      disabled={!props.restartEnabled}
      onClick={props.onRestart}>
      <Icon name="arrow-counterclockwise" />
    </button>
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

interface SidebarProps {
  scripts: [string],
  activeScript: string,
  pixelRatio: number,
  ref: any,
  onLogoClick: (() => void),
  onScriptClick: ((name: string) => void),
};

const Sidebar = (props: SidebarProps) => {
  return <div class="sidebar">
    <div class="toolbar">
      <a class="title" href="/">Toodle Studio</a>
    </div>
    <canvas
      width={170 * props.pixelRatio}
      height={170 * props.pixelRatio}
      ref={props.ref}
      title="Click to pause.\n\nThis animated toodle\nis brought to you by\nhttps://bauble.studio --\na few lines of code to\nmake animated 3D art!"
      onClick={props.onLogoClick} />
    <ul class="file-select">
      <For each={props.scripts}>{(script) =>
        <li
          onClick={() => { props.onScriptClick(script); }}
          class={props.activeScript === script ? "selected" : ""}>
          {script}
        </li>
      }</For>
    </ul>
    <a class="image-link" target="_blank" href="https://github.com/ianthehenry/toodle.studio"><svg><use xlink:href="/icons.svg#github"/></svg></a>
  </div>
}

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
  let logoCanvas: HTMLCanvasElement;
  let editor: EditorView;
  let evalOutputContainer: HTMLElement;
  let runOutputContainer: HTMLPreElement;
  let ctx: CanvasRenderingContext2D;

  const canvasSize = Signal.create(props.size);
  // const pixelRatio = Signal.create(window.devicePixelRatio);
  const pixelRatio = Signal.create(window.devicePixelRatio);
  const imageRendering: Signal.T<Property.ImageRendering> = Signal.create('auto');
  const canvasResolution = createMemo(() => {
    const dpr = Signal.get(pixelRatio);
    const size = Signal.get(canvasSize);
    return {width: dpr * size.width, height: dpr * size.height};
  });

  const scripts = props.scripts;
  const activeScript = Signal.create(Storage.getSelected() ?? scripts[0]!);
  createEffect(() => {
    Storage.saveSelected(Signal.get(activeScript));
  });

  const scriptDirty = Signal.create(true);
  const evaluationState = Signal.create(EvaluationState.Unknown);
  const isVisible = Signal.create(false);

  const timer = new Timer();
  const logoTimer = new Timer();
  const logoAnimating = Signal.create(Storage.getAnimatedLogo() ?? true);

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      Signal.set(isVisible, entry.isIntersecting);
    }
  });

  let nextImage: Signal.T<Image | null> = Signal.create(null);
  let currentImage: Signal.T<Image | null> = Signal.create(null);
  let currentEnvironment: Signal.T<Environment | null> = Signal.create(null);

  // On memory management:
  //
  // We always set nextImage first, and it begins a retain count of one, so we
  // don't retain it again.
  //
  // We then may also set it to currentImage. But we do retain that, because
  // it didn't come directly from wasm.
  createEffect((old: Image | null) => {
    if (old != null) {
      runtime.release_image(old);
    }
    return Signal.get(nextImage);
  }, null);

  createEffect((old: Image | null) => {
    const new_ = Signal.get(currentImage);
    const changed = old !== new_;
    if (changed && old != null) {
      runtime.release_image(old);
    }
    if (changed && new_ != null) {
      runtime.retain_image(new_);
    }
    return new_;
  }, null);

  createEffect((old: Environment | null) => {
    if (old != null) {
      runtime.release_environment(old);
    }
    return Signal.get(currentEnvironment);
  }, null);

  function loadNext() {
    const nextImage_ = Signal.get(nextImage);
    if (nextImage_ != null) {
      Signal.set(currentImage, nextImage_);

      // this isn't actually sufficient to restart but whatever
      Signal.set(currentEnvironment, null);
      runOutputContainer.innerHTML = '';
    }
  }

  function restart() {
    ctx.fillStyle = '#1d1f21';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const currentImage_ = Signal.get(currentImage);
    if (currentImage_ != null) {
      Signal.set(currentEnvironment, runtime.toodle_start(currentImage_).environment);
    }
  }

  function save(scriptName: string, text: string) {
    if (text.trim().length > 0) {
      Storage.saveScript(scriptName, text);
    } else {
      Storage.deleteScript(scriptName);
    }
  }

  const mouse = Signal.create({x: 1, y: -0.5});

  onMount(() => {
    intersectionObserver.observe(canvas);
    editor = installCodeMirror({
      parent: editorContainer,
      save: (text) => {
        save(Signal.get(activeScript), text);
      },
      onChange: () => Signal.set(scriptDirty, true),
      onRun: loadNext
    });

    window.addEventListener('mousemove', (e) => {
      const canvasRect = logoCanvas.getBoundingClientRect();
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      Signal.set(mouse, {
        x: x / canvasRect.width - 0.5,
        y: 0.5 - y / canvasRect.height
      });
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

    const renderer = new Renderer(
      logoCanvas,
      Signal.getter(logoTimer.t),
      Signal.getter(Signal.create({
        width: logoCanvas.width,
        height: logoCanvas.height,
      })),
      Signal.getter(mouse),
    );
    renderer.recompileShader(logoShader);
    const logoRenderLoop = new RenderLoop((elapsed) => batch(() => {
      renderer.draw();
      logoTimer.tick(elapsed, true);
      if (Signal.get(logoAnimating)) {
        logoRenderLoop.schedule();
      }
    }));
    // even if we aren't animating, we always want to draw it once
    logoRenderLoop.schedule();

    createEffect(() => {
      const animating = Signal.get(logoAnimating);
      Storage.saveAnimatedLogo(animating);
      if (animating) {
        logoRenderLoop.schedule();
      }
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

        if (result.isError) {
          Signal.set(nextImage, null);
          Signal.set(evaluationState, EvaluationState.EvaluationError);
          console.error(result.error);
        } else {
          Signal.set(evaluationState, EvaluationState.Success);
          Signal.set(nextImage, result.image);
        }
        outputChannel.target = null;
      }

      if (Signal.get(currentImage) == null && Signal.get(nextImage) != null) {
        loadNext();
      }
      if (Signal.get(currentEnvironment) == null) {
        restart();
      }

      const currentEnvironment_ = Signal.get(currentEnvironment);
      if (currentEnvironment_ != null) {
        const resolution = canvasResolution();
        const origin = {x: resolution.width * 0.5, y: resolution.height * 0.5};
        outputChannel.target = runOutputContainer;
        const result = runtime.toodle_continue(currentEnvironment_);
        if (result.isError) {
          Signal.set(evaluationState, EvaluationState.EvaluationError);
          console.error(result.error);
          Signal.set(currentEnvironment, null);
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
      <AnimationToolbar
        timer={timer}
        restartEnabled={Signal.get(currentImage) != null}
        onRestart={restart}/>
      <canvas
        ref={canvas!}
        class="render-target"
        style={{'image-rendering': Signal.get(imageRendering)}}
        width={canvasResolution().width}
        height={canvasResolution().height}
        tabindex={props.focusable ? 0 : undefined}
      />
      <pre class="runtime-output-container" ref={runOutputContainer!}></pre>
    </div>
    <div class="resize-handle canvas-resize-handle"
      title="double click to auto size"
      onPointerDown={onHandlePointerDown}
      onPointerMove={onHandlePointerMove}
      onDblClick={onHandleDblClick}
    />
    <div class="code-container" ref={codeContainer!}>
      <EditorToolbar
        state={Signal.get(evaluationState)}
        loadEnabled={Signal.get(nextImage) != null}
        onClickLoad={loadNext}
        />
      <div class="editor-container" ref={editorContainer!} />
      <ResizableArea ref={evalOutputContainer!} />
    </div>
    <Sidebar
      scripts={scripts}
      activeScript={Signal.get(activeScript)}
      onScriptClick={(scriptName) => {
        if (scriptName !== Signal.get(activeScript)) {
          Signal.set(activeScript, scriptName);
          Signal.set(currentImage, null);
          Signal.set(currentEnvironment, null);
        }
      }}
      ref={logoCanvas!}
      pixelRatio={Signal.get(pixelRatio)}
      onLogoClick={()=>Signal.set(logoAnimating, !Signal.get(logoAnimating))} />
  </div>;
};
export default App;
