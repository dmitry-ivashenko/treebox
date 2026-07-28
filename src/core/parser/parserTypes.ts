import type { TreeboxValue, NodeDisplayStatus } from "../model/types";

export type ParsedLine = {
  lineNumber: number;
  raw: string;
  depth: number;
  name: string;
  className?: string;
  props: Record<string, TreeboxValue>;
  explicitId?: string;
  comment?: string;
  displayStatus?: NodeDisplayStatus;
  tags?: string[];
  attributes?: Record<string, TreeboxValue>;
  isComment: boolean;
  isEmpty: boolean;
};
