import App from './app';
import { render as renderSolid } from 'solid-js/web';
import InitializeWasm from 'wasm-runtime';
import type {Module} from 'wasm-runtime';
import OutputChannel from './output-channel';

document.addEventListener("DOMContentLoaded", (_) => {
  const outputChannel = new OutputChannel();
  const opts = {
    print: (x: string) => {
      outputChannel.print(x, false);
    },
    printErr: (x: string) => {
      outputChannel.print(x, true);
    },
  };

  switch (window.location.pathname) {
  case '/':
    InitializeWasm(opts).then((runtime: Module) => {
      const scripts = runtime.FS
        .readdir('/examples')
        .filter((name: string) => !name.startsWith('.'))
        .map((name: string) => name.replace(/\.janet$/, ''));
      renderSolid(() => <App
        runtime={runtime}
        outputChannel={outputChannel}
        scripts={scripts}
        focusable={false}
        canSave={true}
        size={{width: 512, height: 512}}
      />, document.body);
    }).catch(console.error);
    break;
  }
});
