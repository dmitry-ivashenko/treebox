import { useEffect, useRef } from "react";
import type { TreeboxInstance } from "../core/instance/types";
import type { TreeboxDocument, NodeId } from "../core/model/types";

function getVisibleNodes(doc: TreeboxDocument): NodeId[] {
  const result: NodeId[] = [];
  const walk = (ids: NodeId[]) => {
    for (const id of ids) {
      const node = doc.nodes[id];
      if (!node) continue;
      result.push(id);
      if (!node.collapsed && node.children.length > 0) walk(node.children);
    }
  };
  walk(doc.rootIds);
  return result;
}

type GlobalUndoOpts = {
  /** First-chance undo. Return true if consumed (skips the instance fallback). */
  onUndo?: () => boolean;
  /** First-chance redo. Return true if consumed (skips the instance fallback). */
  onRedo?: () => boolean;
};

export function useGlobalUndo(instance?: TreeboxInstance | null, opts?: GlobalUndoOpts) {
  const instanceRef = useRef(instance);
  instanceRef.current = instance;
  const onUndoRef = useRef(opts?.onUndo);
  onUndoRef.current = opts?.onUndo;
  const onRedoRef = useRef(opts?.onRedo);
  onRedoRef.current = opts?.onRedo;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const active = document.activeElement;
      const inEditor = active?.closest(".cm-editor");
      const modalOpen = document.querySelector(".modal-overlay");
      const inst = instanceRef.current;
      if (!inst) return;

      switch (e.key) {
        case "z":
        case "Z": {
          if (!meta) return;
          if (inEditor) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            if (!(onRedoRef.current?.() ?? false)) inst.redo();
          } else {
            if (!(onUndoRef.current?.() ?? false)) inst.undo();
          }
          break;
        }
        case "d":
        case "D": {
          if (!meta) return;
          if (inEditor || modalOpen) return;
          e.preventDefault();
          e.stopPropagation();
          const selectedId = inst.doc.viewState.selectedNodeId;
          if (selectedId) inst.duplicateSubtree(selectedId);
          break;
        }
        case "Delete":
        case "Backspace": {
          if (meta) return;
          if (inEditor || modalOpen) return;
          if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") return;
          if ((active as HTMLElement)?.isContentEditable) return;
          const doc = inst.doc;
          const selectedId = doc.viewState.selectedNodeId;
          if (!selectedId) return;
          e.preventDefault();
          e.stopPropagation();
          const visible = getVisibleNodes(doc);
          const idx = visible.indexOf(selectedId);
          const remaining = visible.filter((id) => id !== selectedId);
          const nextId = remaining[Math.max(0, Math.min(idx, remaining.length - 1))] ?? undefined;
          inst.applyExplorerDelete(selectedId);
          inst.setSelectedNode(nextId);
          break;
        }
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);
}
