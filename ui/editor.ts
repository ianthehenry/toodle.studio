import {basicSetup} from 'codemirror';
import {EditorView, keymap, ViewUpdate} from '@codemirror/view';
import {indentWithTab} from '@codemirror/commands';
import {syntaxHighlighting, HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {janet} from 'codemirror-lang-janet';
import {EditorState, Transaction} from '@codemirror/state';

interface StateCommandInput {state: EditorState, dispatch: (_: Transaction) => void}

interface EditorOptions {
  parent: HTMLElement,
  save: ((text: string) => void) | null,
  onChange: (() => void),
}

const highlightStyle = HighlightStyle.define([
  {tag: tags.keyword, color: 'var(--purple)'},
  {tag: tags.atom, color: 'var(--foreground)'},
  {tag: tags.number, color: 'var(--blue)'},
  {tag: tags.comment, color: 'var(--comment)'},
  {tag: tags.null, color: 'var(--purple)'},
  {tag: tags.bool, color: 'var(--purple)'},
  {tag: tags.string, color: 'var(--green)'},
]);

const theme = EditorView.theme({
  "&": {
    color: 'var(--foreground)',
    backgroundColor: 'var(--background)',
  },
  ".cm-content": {
    padding: '0',
    caretColor: 'var(--foreground)',
  },
  ".cm-cursor": {
    borderLeftColor: 'var(--foreground)',
  },
  ".cm-activeLine": {
    backgroundColor: 'initial',
  },
  "&.cm-focused .cm-activeLine": {
    // TODO: this breaks selection highlighting, which is insane
    // backgroundColor: 'var(--line)',
  },
  ".cm-activeLineGutter": {
    backgroundColor: 'initial',
  },
  "&.cm-focused .cm-activeLineGutter": {
    backgroundColor: 'var(--selection)',
  },
  ".cm-selectionMatch": {
    outline: 'solid 1px var(--comment)',
    borderRadius: '2px',
    backgroundColor: 'initial',
  },
  "&.cm-focused .cm-matchingBracket": {
    outline: 'solid 1px var(--green)',
    borderRadius: '2px',
    color: 'var(--green)',
    backgroundColor: 'initial',
  },
  "&.cm-focused .cm-nonmatchingBracket": {
    outline: 'solid 1px var(--red)',
    borderRadius: '2px',
    color: 'var(--red)',
    backgroundColor: 'initial',
  },
  // slightly subtler as you type; i dunno
  // "&.cm-focused .cm-activeLine .cm-matchingBracket": {
  //   outline: 'none',
  // },
  ".cm-foldPlaceholder": {
    outline: 'solid 1px var(--comment)',
    border: 'none',
    width: '2ch',
    display: 'inline-block',
    margin: '0',
    padding: '0',
    textAlign: 'center',
    borderRadius: '2px',
    backgroundColor: 'var(--background)',
    color: 'var(--comment)',
  },
  "&.cm-focused .cm-selectionBackground, & .cm-selectionBackground, ::selection": {
    backgroundColor: 'var(--selection)',
  },
  ".cm-gutters": {
    backgroundColor: 'var(--line)',
    color: 'var(--comment)',
    border: "none",
  },
  // TODO: style the "find/replace" box
});

export default function installCodeMirror({parent, save, onChange}: EditorOptions): EditorView {
  const keyBindings = [indentWithTab];
  if (save != null) {
    keyBindings.push({ key: "Mod-s", run: ({state}: StateCommandInput) => {
      console.log('saving...');
      save(state.doc.toString());
      return true;
    }
   });
  }

  const editor = new EditorView({
    extensions: [
      basicSetup,
      janet(),
      keymap.of(keyBindings),
      EditorView.updateListener.of(function(viewUpdate: ViewUpdate) {
        if (viewUpdate.docChanged) {
          onChange();
        }
      }),
      theme,
      syntaxHighlighting(highlightStyle),
    ],
    parent: parent,
  });

  if (save != null) {
    const saveText = () => save(editor.state.doc.toString());
    setInterval(function() {
      saveText();
    }, 30 * 1000);
    document.addEventListener('pagehide', saveText);
    let savedBefore = false;
    // iOS Safari doesn't support beforeunload,
    // but it does support unload.
    window.addEventListener('beforeunload', () => {
      savedBefore = true;
      saveText();
    });
    window.addEventListener('unload', () => {
      if (!savedBefore) {
        saveText();
      }
    });
  }

  return editor;
}
