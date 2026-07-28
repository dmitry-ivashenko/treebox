export type NodeId = string;

export type TreeboxValue = string | number | boolean | null;

export type NodeDisplayStatus = "added" | "modified" | "removed";

export type TreeboxNode = {
  id: NodeId;
  name: string;
  className?: string;
  props: Record<string, TreeboxValue>;
  children: NodeId[];
  collapsed?: boolean;
  comment?: string;
  note?: string;
  displayStatus?: NodeDisplayStatus;
  tags?: string[];
  attributes?: Record<string, TreeboxValue>;
};

export type TreeboxViewState = {
  selectedNodeId?: NodeId;
  expandedNodeIds: NodeId[];
  textCursor?: {
    line: number;
    column: number;
  };
};

export type TreeboxDocument = {
  schemaVersion: 1;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  rootIds: NodeId[];
  nodes: Record<NodeId, TreeboxNode>;
  viewState: TreeboxViewState;
};

export type ParseError = {
  line: number;
  column?: number;
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type ParseWarning = ParseError;

export type NodeSourceRange = {
  nodeId: NodeId;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
};

export type ParseResult = {
  ok: boolean;
  document?: TreeboxDocument;
  errors: ParseError[];
  warnings: ParseWarning[];
  sourceMap?: NodeSourceRange[];
};

export type FormatSettings = {
  showInternalIds: boolean;
  showEmptyClassBrackets: boolean;
  alignClassColumn: boolean;
  alignPropsColumn: boolean;
  quoteNames: "auto" | "always" | "never";
  sortProps: boolean;
  includeAllIds?: boolean;
};

export const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  showInternalIds: false,
  showEmptyClassBrackets: false,
  alignClassColumn: false,
  alignPropsColumn: false,
  quoteNames: "auto",
  sortProps: false,
};

export type TreeOperation =
  | { type: "addNode"; parentId?: NodeId; index?: number; node: TreeboxNode }
  | { type: "deleteNode"; nodeId: NodeId }
  | { type: "renameNode"; nodeId: NodeId; name: string }
  | { type: "setClassName"; nodeId: NodeId; className?: string }
  | { type: "setProp"; nodeId: NodeId; key: string; value: TreeboxValue }
  | { type: "deleteProp"; nodeId: NodeId; key: string }
  | {
      type: "moveNode";
      nodeId: NodeId;
      newParentId?: NodeId;
      newIndex: number;
    }
  | {
      type: "duplicateSubtree";
      nodeId: NodeId;
      newParentId?: NodeId;
      index?: number;
    };
