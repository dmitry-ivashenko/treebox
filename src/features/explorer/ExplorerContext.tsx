import { createContext, useContext } from "react";
import type { TreeboxDocument, NodeId, TreeboxValue, NodeDisplayStatus } from "../../core/model/types";

export type ExplorerContextValue = {
  doc: TreeboxDocument;
  applyExplorerAdd: (parentId: NodeId | null, name: string, className?: string) => void;
  applyExplorerDelete: (nodeId: NodeId) => void;
  applyExplorerRename: (nodeId: NodeId, name: string) => void;
  applyExplorerMove: (nodeId: NodeId, newParentId: NodeId | null, newIndex: number) => void;
  applyExplorerToggleCollapse: (nodeId: NodeId) => void;
  duplicateSubtree: (nodeId: NodeId) => void;
  setSelectedNode: (nodeId: NodeId | undefined) => void;
  collapseAll: () => void;
  expandAll: () => void;
  updateNode: (nodeId: NodeId, updates: { name?: string; className?: string; props?: Record<string, TreeboxValue>; displayStatus?: NodeDisplayStatus; note?: string }) => void;
  setText?: (text: string) => void;
  resetDocument?: (doc: TreeboxDocument) => void;
};

const ExplorerCtx = createContext<ExplorerContextValue | null>(null);

export function ExplorerProvider({ value, children }: { value: ExplorerContextValue; children: React.ReactNode }) {
  return <ExplorerCtx.Provider value={value}>{children}</ExplorerCtx.Provider>;
}

export function useExplorerContext(): ExplorerContextValue {
  const ctx = useContext(ExplorerCtx);
  if (!ctx) throw new Error("useExplorerContext must be used within ExplorerProvider");
  return ctx;
}
