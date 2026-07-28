import type {
  TreeboxDocument,
  TreeboxValue,
  ParseResult,
  NodeId,
} from "../model/types";

export type DisplayMode = "code" | "explorer" | "split-v" | "split-h";

export type TreeboxInstance = {
  instanceId: string;

  doc: TreeboxDocument;
  textBuffer: string;
  parseResult: ParseResult;
  dirty: boolean;

  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;

  setText: (text: string) => void;

  applyExplorerAdd: (parentId: NodeId | null, name: string, className?: string) => void;
  applyExplorerDelete: (nodeId: NodeId) => void;
  applyExplorerRename: (nodeId: NodeId, name: string) => void;
  applyExplorerMove: (nodeId: NodeId, newParentId: NodeId | null, newIndex: number) => void;
  applyExplorerToggleCollapse: (nodeId: NodeId) => void;
  duplicateSubtree: (nodeId: NodeId) => void;
  setSelectedNode: (nodeId: NodeId | undefined) => void;
  collapseAll: () => void;
  expandAll: () => void;
  updateNode: (nodeId: NodeId, updates: { name?: string; className?: string; props?: Record<string, TreeboxValue> }) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  markClean: () => void;
  resetDocument: (doc: TreeboxDocument) => void;
};

export type UseTreeboxInstanceOptions = {
  initialDoc: TreeboxDocument;
  initialText: string;
  defaultDisplayMode?: DisplayMode;
  instanceId?: string;
  includeAllIds?: boolean;
};
