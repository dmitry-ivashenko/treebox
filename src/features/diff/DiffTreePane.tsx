import type { TreeboxDocument, NodeId } from "../../core/model/types";
import type { TreeboxDiff, DiffStatus } from "../../core/diff/diffTypes";
import { getClassIcon } from "../explorer/classIcons";

type Props = {
  doc: TreeboxDocument;
  side: "left" | "right";
  diff: TreeboxDiff;
  title?: string;
};

export function DiffTreePane({ doc, side, diff, title }: Props) {
  const getStatus = (nodeId: NodeId): DiffStatus => {
    const pair = diff.nodePairs.find(
      (p) =>
        (side === "left" && p.leftNodeId === nodeId) ||
        (side === "right" && p.rightNodeId === nodeId)
    );
    return pair?.status ?? "unchanged";
  };

  return (
    <div className="diff-tree-pane">
      <div className="diff-pane-header">
        {title ?? (side === "left" ? "Before" : "After")}
      </div>
      <div className="diff-tree">
        {doc.rootIds.map((id) => (
          <DiffNodeRow
            key={id}
            nodeId={id}
            doc={doc}
            depth={0}
            getStatus={getStatus}
          />
        ))}
      </div>
    </div>
  );
}

function DiffNodeRow({
  nodeId,
  doc,
  depth,
  getStatus,
}: {
  nodeId: NodeId;
  doc: TreeboxDocument;
  depth: number;
  getStatus: (id: NodeId) => DiffStatus;
}) {
  const node = doc.nodes[nodeId];
  if (!node) return null;

  const status = getStatus(nodeId);
  const classIcon = getClassIcon(node.className);

  return (
    <>
      <div
        className={`diff-row diff-status-${status}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <span className="diff-marker">{getMarker(status)}</span>
        <span
          className="diff-node-icon"
          dangerouslySetInnerHTML={{ __html: classIcon.svg }}
        />
        <span className="diff-node-name">{node.name}</span>
        {Object.keys(node.props).length > 0 && (
          <span className="diff-node-props">
            {Object.entries(node.props).map(([k, v]) => (
              <span key={k} className="diff-prop">
                <span className="diff-prop-key">{k}</span>=<span className="diff-prop-value">{String(v)}</span>
              </span>
            ))}
          </span>
        )}
        {node.comment && (
          <span className="explorer-comment">{node.comment}</span>
        )}
      </div>
      {node.children.map((childId) => (
        <DiffNodeRow
          key={childId}
          nodeId={childId}
          doc={doc}
          depth={depth + 1}
          getStatus={getStatus}
        />
      ))}
    </>
  );
}

function getMarker(status: DiffStatus): string {
  switch (status) {
    case "added": return "+";
    case "removed": return "−";
    case "changed": return "~";
    case "moved": return "↪";
    case "renamed": return "✎";
    default: return "";
  }
}
