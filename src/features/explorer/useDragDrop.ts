import { useRef, useState, useCallback } from "react";
import { useExplorerContext } from "./ExplorerContext";
import type { NodeId } from "../../core/model/types";

export type DropPosition = "before" | "inside" | "after";

export type DropTarget = {
  nodeId: NodeId;
  position: DropPosition;
};

export function useDragDrop() {
  const [draggedId, setDraggedId] = useState<NodeId | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dragCounter = useRef(0);
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoExpandTarget = useRef<NodeId | null>(null);

  const { doc: currentDocument, applyExplorerMove, applyExplorerToggleCollapse } = useExplorerContext();

  const isDescendant = useCallback(
    (ancestorId: NodeId, nodeId: NodeId): boolean => {
      const node = currentDocument.nodes[ancestorId];
      if (!node) return false;
      if (node.children.includes(nodeId)) return true;
      return node.children.some((childId) => isDescendant(childId, nodeId));
    },
    [currentDocument]
  );

  const isValidDrop = useCallback(
    (target: DropTarget): boolean => {
      if (!draggedId) return false;
      if (draggedId === target.nodeId) return false;
      if (isDescendant(draggedId, target.nodeId)) return false;
      return true;
    },
    [draggedId, isDescendant]
  );

  const handleDragStart = useCallback(
    (nodeId: NodeId) => (e: React.DragEvent) => {
      setDraggedId(nodeId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", nodeId);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTarget(null);
    dragCounter.current = 0;
    if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
    autoExpandTarget.current = null;
  }, []);

  const handleDragOver = useCallback(
    (nodeId: NodeId) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      let position: DropPosition;
      if (y < height * 0.25) {
        position = "before";
      } else if (y > height * 0.75) {
        position = "after";
      } else {
        position = "inside";
      }

      const target: DropTarget = { nodeId, position };
      if (isValidDrop(target)) {
        e.dataTransfer.dropEffect = "move";
        setDropTarget(target);
      } else {
        e.dataTransfer.dropEffect = "none";
        setDropTarget(null);
      }

      // Auto-expand collapsed nodes after 500ms hover
      if (position === "inside" && autoExpandTarget.current !== nodeId) {
        if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
        autoExpandTarget.current = nodeId;
        const node = currentDocument.nodes[nodeId];
        if (node && node.collapsed && node.children.length > 0) {
          autoExpandTimer.current = setTimeout(() => {
            applyExplorerToggleCollapse(nodeId);
          }, 500);
        }
      } else if (position !== "inside") {
        if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
        autoExpandTarget.current = null;
      }
    },
    [isValidDrop, currentDocument, applyExplorerToggleCollapse]
  );

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setDropTarget(null);
      dragCounter.current = 0;
    }
  }, []);

  const handleDragEnter = useCallback(() => {
    dragCounter.current++;
  }, []);

  const handleDrop = useCallback(
    (_nodeId: NodeId) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedId || !dropTarget) {
        handleDragEnd();
        return;
      }

      if (!isValidDrop(dropTarget)) {
        handleDragEnd();
        return;
      }

      const targetNode = currentDocument.nodes[dropTarget.nodeId];
      if (!targetNode) {
        handleDragEnd();
        return;
      }

      const findParentId = (nid: NodeId): NodeId | null => {
        for (const [id, node] of Object.entries(currentDocument.nodes)) {
          if (node.children.includes(nid)) return id;
        }
        return null;
      };

      const findIndex = (nid: NodeId): number => {
        const parentId = findParentId(nid);
        if (parentId) {
          return currentDocument.nodes[parentId].children.indexOf(nid);
        }
        return currentDocument.rootIds.indexOf(nid);
      };

      let newParentId: NodeId | null;
      let newIndex: number;

      switch (dropTarget.position) {
        case "inside": {
          newParentId = dropTarget.nodeId;
          newIndex = targetNode.children.length;
          break;
        }
        case "before": {
          newParentId = findParentId(dropTarget.nodeId);
          newIndex = findIndex(dropTarget.nodeId);
          break;
        }
        case "after": {
          newParentId = findParentId(dropTarget.nodeId);
          newIndex = findIndex(dropTarget.nodeId) + 1;
          break;
        }
      }

      applyExplorerMove(draggedId, newParentId, newIndex);
      handleDragEnd();
    },
    [draggedId, dropTarget, currentDocument, applyExplorerMove, isValidDrop, handleDragEnd]
  );

  return {
    draggedId,
    dropTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDragEnter,
    handleDrop,
  };
}
