import type { NodeId } from "../model/types";

export type DiffStatus =
  | "unchanged"
  | "added"
  | "removed"
  | "changed"
  | "moved"
  | "renamed";

export type DiffChangeType =
  | "added"
  | "removed"
  | "renamed"
  | "classChanged"
  | "propsChanged"
  | "moved"
  | "reordered";

export type DiffNodePair = {
  pairId: string;
  leftNodeId?: NodeId;
  rightNodeId?: NodeId;
  status: DiffStatus;
};

export type DiffChange = {
  id: string;
  type: DiffChangeType;
  leftNodeId?: NodeId;
  rightNodeId?: NodeId;
  pathBefore?: string;
  pathAfter?: string;
  details?: Record<string, unknown>;
};

export type DiffSummary = {
  added: number;
  removed: number;
  changed: number;
  moved: number;
  reordered: number;
};

export type TreeboxDiff = {
  leftDocumentId: string;
  rightDocumentId: string;
  nodePairs: DiffNodePair[];
  changes: DiffChange[];
  summary: DiffSummary;
};

export type AlignedDiffRow = {
  depth: number;
  leftNodeId?: NodeId;
  rightNodeId?: NodeId;
  status: DiffStatus;
  changes: DiffChange[];
};
