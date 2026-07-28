import { useRef, useCallback } from "react";
import { ExplorerNodeRow } from "./ExplorerNodeRow";
import { DragDropProvider } from "./DragDropContext";
import { useExplorerContext } from "./ExplorerContext";
import { parseTreeText } from "../../core/parser/parseTreeText";
import { serializeTreeText } from "../../core/serializer/serializeTreeText";
import { createDocument } from "../../core/model/createDocument";
import { generateNodeId } from "../../core/model/createNode";
import { TEMPLATES } from "../../core/model/templates";
import type { NodeId, TreeboxDocument, TreeboxNode } from "../../core/model/types";

export function ExplorerPaneInner() {
  const {
    doc,
    applyExplorerAdd,
    applyExplorerDelete,
    applyExplorerMove,
    applyExplorerToggleCollapse,
    collapseAll,
    expandAll,
    setSelectedNode,
    duplicateSubtree,
    resetDocument,
  } = useExplorerContext();
  const treeRef = useRef<HTMLDivElement>(null);

  const getVisibleNodes = useCallback((): NodeId[] => {
    const result: NodeId[] = [];
    const walk = (ids: NodeId[]) => {
      for (const id of ids) {
        const node = doc.nodes[id];
        if (!node) continue;
        result.push(id);
        if (!node.collapsed && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(doc.rootIds);
    return result;
  }, [doc]);

  const findParentId = useCallback(
    (nodeId: NodeId): NodeId | null => {
      for (const [id, node] of Object.entries(doc.nodes)) {
        if (node.children.includes(nodeId)) return id;
      }
      return null;
    },
    [doc]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".modal-overlay")) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const selectedId = doc.viewState.selectedNodeId;
      const visible = getVisibleNodes();

      if (!selectedId || visible.indexOf(selectedId) === -1) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (visible.length > 0) {
            setSelectedNode(e.key === "ArrowDown" ? visible[0] : visible[visible.length - 1]);
          }
        }
        return;
      }

      const idx = visible.indexOf(selectedId);
      const node = doc.nodes[selectedId];
      if (!node) return;

      const metaKey = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (idx < visible.length - 1) setSelectedNode(visible[idx + 1]);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (idx > 0) setSelectedNode(visible[idx - 1]);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (node.children.length > 0 && node.collapsed) {
            applyExplorerToggleCollapse(selectedId);
          } else if (node.children.length > 0) {
            setSelectedNode(node.children[0]);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (node.children.length > 0 && !node.collapsed) {
            applyExplorerToggleCollapse(selectedId);
          } else {
            const parentId = findParentId(selectedId);
            if (parentId) setSelectedNode(parentId);
          }
          break;
        }
        case "Enter": {
          if (metaKey) {
            e.preventDefault();
            applyExplorerAdd(selectedId, "NewNode");
          } else if (e.shiftKey) {
            e.preventDefault();
            applyExplorerAdd(findParentId(selectedId), "NewNode");
          } else {
            e.preventDefault();
            const row = treeRef.current?.querySelector(".explorer-row.selected") as HTMLElement;
            if (row) row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
          }
          break;
        }
        case "Delete":
        case "Backspace": {
          if (!metaKey) {
            e.preventDefault();
            const nextIdx = Math.min(idx, visible.length - 2);
            const nextId = visible.filter((id) => id !== selectedId)[
              Math.max(0, nextIdx - (idx > 0 ? 1 : 0))
            ];
            applyExplorerDelete(selectedId);
            if (nextId) setSelectedNode(nextId);
          }
          break;
        }
        case "d": {
          if (metaKey) {
            e.preventDefault();
            e.stopPropagation();
            duplicateSubtree(selectedId);
          }
          break;
        }
        case "c": {
          if (metaKey) {
            e.preventDefault();
            const subText = serializeSubtree(doc, selectedId);
            navigator.clipboard.writeText(subText);
          }
          break;
        }
        case "v": {
          if (metaKey) {
            e.preventDefault();
            navigator.clipboard.readText().then((text) => {
              const result = parseTreeText(text);
              if (result.ok && result.document) {
                for (const rootId of result.document.rootIds) {
                  importSubtreeViaContext(result.document, rootId, selectedId, doc, resetDocument!);
                }
              }
            });
          }
          break;
        }
      }
    },
    [
      doc,
      getVisibleNodes,
      findParentId,
      setSelectedNode,
      applyExplorerAdd,
      applyExplorerDelete,
      applyExplorerToggleCollapse,
      applyExplorerMove,
      duplicateSubtree,
    ]
  );

  if (doc.rootIds.length === 0) {
    return <EmptyExplorerInner />;
  }

  return (
    <DragDropProvider>
      <div className="explorer-pane">
        <div className="explorer-header">
          <span>Explorer</span>
          <div className="explorer-header-actions">
            <button className="explorer-header-btn" title="Expand all" onClick={expandAll}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 2L8 6L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>
            </button>
            <button className="explorer-header-btn" title="Collapse all" onClick={collapseAll}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <path d="M4 10L8 6L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 14L8 10L12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>
            </button>
          </div>
        </div>
        <div
          ref={treeRef}
          className="explorer-tree"
          role="tree"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNode(undefined);
          }}
          onDragOver={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              const nodeId = e.dataTransfer.getData("text/plain");
              if (nodeId) {
                applyExplorerMove(nodeId, null, doc.rootIds.length);
              }
            }
          }}
        >
          {doc.rootIds.map((id) => (
            <ExplorerNodeRow key={id} nodeId={id} doc={doc} depth={0} />
          ))}
        </div>
      </div>
    </DragDropProvider>
  );
}

function EmptyExplorerInner() {
  const { applyExplorerAdd, setText: ctxSetText } = useExplorerContext();
  const setText = ctxSetText ?? (() => {});

  return (
    <div className="explorer-pane explorer-empty">
      <div className="explorer-header">Explorer</div>
      <div className="explorer-empty-content">
        <p>No nodes yet.</p>
        <button
          onClick={() => applyExplorerAdd(null, "NewNode", "Model")}
          className="btn btn-primary"
        >
          Add root node
        </button>
        <button
          onClick={() => setText(TEMPLATES[1].text)}
          className="btn"
        >
          Load example
        </button>
      </div>
    </div>
  );
}

function serializeSubtree(doc: TreeboxDocument, nodeId: NodeId): string {
  const nodes: Record<string, TreeboxNode> = {};
  const walk = (id: NodeId) => {
    const n = doc.nodes[id];
    if (!n) return;
    nodes[id] = n;
    n.children.forEach(walk);
  };
  walk(nodeId);
  const subDoc = createDocument({ rootIds: [nodeId], nodes });
  return serializeTreeText(subDoc);
}

function importSubtreeViaContext(
  source: TreeboxDocument,
  rootId: NodeId,
  targetParentId: NodeId,
  currentDoc: TreeboxDocument,
  resetDocument: (doc: TreeboxDocument) => void
): void {
  const doc = { ...currentDoc };
  const nodes = { ...doc.nodes };

  const idMap = new Map<string, string>();
  const walk = (id: NodeId) => {
    const n = source.nodes[id];
    if (!n) return;
    idMap.set(id, generateNodeId());
    n.children.forEach(walk);
  };
  walk(rootId);

  for (const [oldId, newId] of idMap) {
    const srcNode = source.nodes[oldId];
    nodes[newId] = {
      ...srcNode,
      id: newId,
      children: srcNode.children.map((c) => idMap.get(c) ?? c),
    };
  }

  const newRootId = idMap.get(rootId)!;
  if (targetParentId && nodes[targetParentId]) {
    const parent = { ...nodes[targetParentId] };
    parent.children = [...parent.children, newRootId];
    nodes[targetParentId] = parent;
  } else {
    doc.rootIds = [...doc.rootIds, newRootId];
  }

  doc.nodes = nodes;
  doc.updatedAt = new Date().toISOString();
  resetDocument(doc);
}
