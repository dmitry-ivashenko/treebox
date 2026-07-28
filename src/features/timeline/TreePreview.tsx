import { getClassIcon } from "../explorer/classIcons";
import type { TreeboxDocument, NodeId } from "../../core/model/types";

type Props = {
  doc: TreeboxDocument;
};

export function TreePreview({ doc }: Props) {
  return (
    <div className="tree-preview">
      {doc.rootIds.map((id) => (
        <TreePreviewRow key={id} nodeId={id} doc={doc} depth={0} />
      ))}
    </div>
  );
}

function TreePreviewRow({ nodeId, doc, depth }: { nodeId: NodeId; doc: TreeboxDocument; depth: number }) {
  const node = doc.nodes[nodeId];
  if (!node) return null;

  const icon = getClassIcon(node.className);
  const hasChildren = node.children.length > 0;
  const hasPackage = node.children.some((id) => doc.nodes[id]?.className === "PackageLink");

  return (
    <>
      <div
        className="explorer-row tree-preview-row"
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
      >
        <span className="explorer-arrow">
          {hasChildren ? "▼" : ""}
        </span>
        <span className="explorer-icon" dangerouslySetInnerHTML={{ __html: icon.svg }} />
        <span className="explorer-name">{node.name}</span>

        {Object.keys(node.props).length > 0 && (
          <span className="explorer-props">
            {Object.entries(node.props).map(([k, v]) => (
              <span key={k} className="explorer-prop">
                <span className="explorer-prop-key">{k}</span>
                <span className="explorer-prop-eq">=</span>
                <span className="explorer-prop-value">{String(v)}</span>
              </span>
            ))}
          </span>
        )}

        {node.comment && (
          <span className="explorer-comment">{node.comment}</span>
        )}


        {node.displayStatus && (
          <span className={`explorer-status-marker status-${node.displayStatus}`}>
            {node.displayStatus === "added" ? "+" : node.displayStatus === "modified" ? "●" : "−"}
          </span>
        )}

        {hasPackage && (
          <span className="explorer-package-badge" title="Package">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <rect x="1.5" y="5" width="7" height="6" rx="3" stroke="#bbb" strokeWidth="1.4" fill="none"/>
              <rect x="7.5" y="5" width="7" height="6" rx="3" stroke="#bbb" strokeWidth="1.4" fill="none"/>
            </svg>
          </span>
        )}
      </div>
      {node.note && node.note.split("\n").map((line, i) => (
        <div
          key={`note-${i}`}
          className="explorer-row explorer-note-row"
          style={{ paddingLeft: `${(depth + 2) * 20 + 4}px` }}
        >
          <span className="explorer-note-text">{line}</span>
        </div>
      ))}
      {node.children.map((childId) => (
        <TreePreviewRow key={childId} nodeId={childId} doc={doc} depth={depth + 1} />
      ))}
    </>
  );
}
