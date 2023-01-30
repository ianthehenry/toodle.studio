import {basicSetup} from 'codemirror';
import {EditorView, keymap, ViewUpdate} from '@codemirror/view';
import {indentWithTab} from '@codemirror/commands';
import {syntaxTree, syntaxHighlighting, HighlightStyle} from '@codemirror/language';
import {SyntaxNode} from '@lezer/common';
import {tags} from '@lezer/highlight';
import {janet} from 'codemirror-lang-janet';
import {EditorState, EditorSelection, Transaction} from '@codemirror/state';
import * as Storage from './storage';

function save({state}: StateCommandInput) {
  console.log('saving...');
  const script = state.doc.toString();
  if (script.trim().length > 0) {
    Storage.saveScript(script);
  } else {
    Storage.deleteScript();
  }
  return true;
}

function isNumberNode(node: SyntaxNode) {
  return node.type.name === 'Number';
}

interface StateCommandInput {state: EditorState, dispatch: (_: Transaction) => void}

interface EditorOptions {
  initialScript: string,
  parent: HTMLElement,
  canSave: boolean,
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

export default function installCodeMirror({initialScript, parent, canSave, onChange}: EditorOptions): EditorView {
  const keyBindings = [indentWithTab];
  if (canSave) {
    keyBindings.push({ key: "Mod-s", run: save });
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
    doc: initialScript,
  });

  if (canSave) {
    setInterval(function() {
      save(editor);
    }, 30 * 1000);
    document.addEventListener('pagehide', () => {
      save(editor);
    });
    let savedBefore = false;
    // iOS Safari doesn't support beforeunload,
    // but it does support unload.
    window.addEventListener('beforeunload', () => {
      savedBefore = true;
      save(editor);
    });
    window.addEventListener('unload', () => {
      if (!savedBefore) {
        save(editor);
      }
    });
  }

  return editor;
}
