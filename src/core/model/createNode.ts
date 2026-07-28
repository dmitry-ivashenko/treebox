import { nanoid } from "nanoid";
import type { TreeboxNode } from "./types";

export function generateNodeId(): string {
  return `n_${nanoid(6)}`;
}

export function createNode(
  overrides: Partial<TreeboxNode> & { name: string }
): TreeboxNode {
  return {
    id: overrides.id ?? generateNodeId(),
    name: overrides.name,
    className: overrides.className,
    props: overrides.props ?? {},
    children: overrides.children ?? [],
    collapsed: overrides.collapsed,
    note: overrides.note,
  };
}
