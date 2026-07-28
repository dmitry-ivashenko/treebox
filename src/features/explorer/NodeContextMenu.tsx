import { useEffect, useRef } from "react";
import { useExplorerContext } from "./ExplorerContext";
import { serializeTreeText } from "../../core/serializer/serializeTreeText";
import { createDocument } from "../../core/model/createDocument";
import type { NodeId } from "../../core/model/types";

type Props = {
  nodeId: NodeId;
  x: number;
  y: number;
  onClose: () => void;
  onEditProps: () => void;
};

export function NodeContextMenu({ nodeId, x, y, onClose, onEditProps }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    doc: currentDocument,
    applyExplorerAdd,
    applyExplorerDelete,
    applyExplorerToggleCollapse,
    duplicateSubtree,
  } = useExplorerContext();

  const node = currentDocument.nodes[nodeId];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!node) return null;

  const findParentId = (): NodeId | null => {
    for (const [id, n] of Object.entries(currentDocument.nodes)) {
      if (n.children.includes(nodeId)) return id;
    }
    return null;
  };

  const copySubtreeAsText = () => {
    const subDoc = createDocument({
      rootIds: [nodeId],
      nodes: collectSubtreeNodes(nodeId),
    });
    const text = serializeTreeText(subDoc);
    navigator.clipboard.writeText(text);
    onClose();
  };

  const copySubtreeAsJson = () => {
    const nodes = collectSubtreeNodes(nodeId);
    navigator.clipboard.writeText(JSON.stringify(nodes, null, 2));
    onClose();
  };

  const copyPath = () => {
    const path = buildPath(nodeId);
    navigator.clipboard.writeText(path);
    onClose();
  };

  const buildPath = (nid: NodeId): string => {
    const pathParts: string[] = [];
    let cur: NodeId | null = nid;
    while (cur) {
      const n = currentDocument.nodes[cur];
      if (!n) break;
      pathParts.unshift(n.name);
      let parent: NodeId | null = null;
      for (const [id, nd] of Object.entries(currentDocument.nodes)) {
        if (nd.children.includes(cur)) { parent = id; break; }
      }
      cur = parent;
    }
    return "/" + pathParts.join("/");
  };

  const collectSubtreeNodes = (rootId: NodeId): Record<string, typeof node> => {
    const result: Record<string, typeof node> = {};
    const walk = (id: NodeId) => {
      const n = currentDocument.nodes[id];
      if (!n) return;
      result[id] = n;
      n.children.forEach(walk);
    };
    walk(rootId);
    return result;
  };

  const items = [
    { label: "Add child", action: () => { applyExplorerAdd(nodeId, "NewNode"); onClose(); } },
    { label: "Add sibling after", action: () => { applyExplorerAdd(findParentId(), "NewNode"); onClose(); } },
    { label: "---" },
    { label: "Edit properties", action: () => { onEditProps(); onClose(); } },
    { label: "---" },
    { label: "Duplicate", action: () => { duplicateSubtree(nodeId); onClose(); } },
    { label: "---" },
    { label: "Copy as text", action: copySubtreeAsText },
    { label: "Copy as JSON", action: copySubtreeAsJson },
    { label: "Copy path", action: () => { copyPath(); } },
    { label: "---" },
    ...(node.children.length > 0
      ? [
          {
            label: node.collapsed ? "Expand subtree" : "Collapse subtree",
            action: () => { applyExplorerToggleCollapse(nodeId); onClose(); },
          },
          { label: "---" },
        ]
      : []),
    { label: "Delete", action: () => { applyExplorerDelete(nodeId); onClose(); }, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ top: y, left: x }}
    >
      {items.map((item, i) =>
        item.label === "---" ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <div
            key={i}
            className={`context-menu-item ${(item as { danger?: boolean }).danger ? "danger" : ""}`}
            onClick={item.action}
          >
            {item.label}
          </div>
        )
      )}
    </div>
  );
}
