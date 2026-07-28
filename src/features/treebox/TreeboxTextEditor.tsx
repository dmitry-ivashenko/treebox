import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers, drawSelection, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { treeboxHighlightPlugin, treeboxHighlightTheme } from "../editor/treeboxHighlight";

function duplicateSelectionOrLine(view: EditorView): boolean {
  const { state } = view;
  const specs = state.changeByRange((range) => {
    if (range.empty) {
      const line = state.doc.lineAt(range.head);
      const lineText = state.doc.sliceString(line.from, line.to);
      const insert = "\n" + lineText;
      return {
        changes: { from: line.to, insert },
        range: EditorSelection.cursor(line.to + insert.length),
      };
    }
    const text = state.doc.sliceString(range.from, range.to);
    return {
      changes: { from: range.to, insert: text },
      range: EditorSelection.cursor(range.to + text.length),
    };
  });
  view.dispatch(specs);
  return true;
}

const theme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  ".cm-content": {
    padding: "12px 0",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-secondary)",
    borderRight: "1px solid var(--border)",
    color: "var(--text-muted)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-active)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--bg-active)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--text-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(137, 180, 250, 0.25) !important",
  },
  ".cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "rgba(137, 180, 250, 0.25) !important",
  },
});

const duplicateKeymap = keymap.of([
  { key: "Mod-d", run: duplicateSelectionOrLine },
]);

const tabKeymap = keymap.of([
  { key: "Tab", run: indentMore },
  { key: "Shift-Tab", run: indentLess },
]);

type Props = {
  text: string;
  onTextChange: (text: string) => void;
};

export function TreeboxTextEditor({ text, onTextChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const suppressExternal = useRef(false);
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: text,
      extensions: [
        lineNumbers(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        rectangularSelection(),
        crosshairCursor(),
        history(),
        indentUnit.of("    "),
        duplicateKeymap,
        tabKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        theme,
        treeboxHighlightPlugin,
        treeboxHighlightTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressExternal.current) {
            onTextChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== text) {
      suppressExternal.current = true;
      view.dispatch({ changes: { from: 0, to: current.length, insert: text } });
      suppressExternal.current = false;
    }
  }, [text]);

  return <div ref={containerRef} className="tree-text-editor" />;
}
