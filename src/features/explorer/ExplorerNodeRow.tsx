import { useState } from "react";
import { useExplorerContext } from "./ExplorerContext";
import { NodePropertyEditor } from "./NodePropertyEditor";
import { NodeContextMenu } from "./NodeContextMenu";
import { useDragDropContext } from "./DragDropContext";
import { getClassIcon } from "./classIcons";
import type { NodeId, TreeboxDocument } from "../../core/model/types";

type Props = {
  nodeId: NodeId;
  doc: TreeboxDocument;
  depth: number;
};

export function ExplorerNodeRow({ nodeId, doc, depth }: Props) {
  const node = doc.nodes[nodeId];
  const {
    doc: currentDocument,
    applyExplorerAdd,
    applyExplorerDelete,
    applyExplorerRename,
    applyExplorerToggleCollapse,
    setSelectedNode,
  } = useExplorerContext();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showProps, setShowProps] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { draggedId, dropTarget, handleDragStart, handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave, handleDrop } = useDragDropContext();

  if (!node) return null;

  const isSelected = currentDocument.viewState.selectedNodeId === nodeId;
  const isCollapsed = node.collapsed;
  const hasChildren = node.children.length > 0;
  const classIcon = getClassIcon(node.className);

  const handleSelect = () => setSelectedNode(nodeId);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyExplorerToggleCollapse(nodeId);
  };

  const handleStartRename = () => {
    setRenameValue(node.name);
    setIsRenaming(true);
  };

  const handleFinishRename = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      applyExplorerRename(nodeId, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRenaming && !e.metaKey && !e.ctrlKey && !e.shiftKey && isSelected) {
      e.preventDefault();
      e.stopPropagation();
      handleStartRename();
    }
  };

  const isDragged = draggedId === nodeId;
  const isDropTarget = dropTarget?.nodeId === nodeId;
  const dropPosition = isDropTarget ? dropTarget.position : null;

  const rowClassName = [
    "explorer-row",
    isSelected ? "selected" : "",
    isDragged ? "dragging" : "",
    isDropTarget ? `drop-${dropPosition}` : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <div role="treeitem" aria-expanded={hasChildren ? !isCollapsed : undefined}>
        <div
          className={rowClassName}
          style={{ paddingLeft: `${depth * 20 + 4}px` }}
          onClick={handleSelect}
          onDoubleClick={handleStartRename}
          onKeyDown={handleKeyDown}
          onContextMenu={(e) => {
            e.preventDefault();
            setSelectedNode(nodeId);
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
          tabIndex={-1}
          draggable={!isRenaming}
          onDragStart={handleDragStart(nodeId)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver(nodeId)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop(nodeId)}
        >
          <span
            className={`explorer-arrow ${hasChildren ? "" : "leaf"}`}
            onClick={handleToggle}
          >
            {hasChildren ? (isCollapsed ? "▶" : "▼") : ""}
          </span>

          <span
            className="explorer-icon"
            dangerouslySetInnerHTML={{ __html: classIcon.svg }}
          />

          {isRenaming ? (
            <input
              className="explorer-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleFinishRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              autoFocus
            />
          ) : (
            <span className="explorer-name">{node.name}</span>
          )}

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

          {hasPackageLink(node, doc) && (
            <span className="explorer-package-badge" title="Package">
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <rect x="1.5" y="5" width="7" height="6" rx="3" stroke="#bbb" strokeWidth="1.4" fill="none"/>
                <rect x="7.5" y="5" width="7" height="6" rx="3" stroke="#bbb" strokeWidth="1.4" fill="none"/>
              </svg>
            </span>
          )}

          <div className="explorer-actions">
            <button
              className="explorer-action-btn"
              title="Edit properties"
              onClick={(e) => {
                e.stopPropagation();
                setShowProps(true);
              }}
            >
              ⚙
            </button>
            <button
              className="explorer-action-btn"
              title="Add child"
              onClick={(e) => {
                e.stopPropagation();
                applyExplorerAdd(nodeId, "NewNode");
              }}
            >
              +
            </button>
            <button
              className="explorer-action-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                applyExplorerDelete(nodeId);
              }}
            >
              ×
            </button>
          </div>
        </div>

        {(node.note || (hasChildren && !isCollapsed)) && (
          <div role="group">
            {node.note && !isCollapsed && node.note.split("\n").map((line, i) => (
              <div
                key={`note-${i}`}
                className="explorer-row explorer-note-row"
                style={{ paddingLeft: `${(depth + 2) * 20 + 4}px` }}
              >
                <span className="explorer-note-text">{line}</span>
              </div>
            ))}
            {hasChildren && !isCollapsed && node.children.map((childId) => (
              <ExplorerNodeRow
                key={childId}
                nodeId={childId}
                doc={doc}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>

      {showProps && (
        <NodePropertyEditor nodeId={nodeId} onClose={() => setShowProps(false)} />
      )}

      {contextMenu && (
        <NodeContextMenu
          nodeId={nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEditProps={() => setShowProps(true)}
        />
      )}
    </>
  );
}

function hasPackageLink(
  node: { children: string[] },
  doc: TreeboxDocument
): boolean {
  return node.children.some((childId) => {
    const child = doc.nodes[childId];
    return child?.className === "PackageLink";
  });
}
