import { nanoid } from "nanoid";
import type { TreeboxDocument } from "./types";

export function createDocument(
  overrides?: Partial<TreeboxDocument>
): TreeboxDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: overrides?.id ?? nanoid(10),
    title: overrides?.title ?? "Untitled",
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    rootIds: overrides?.rootIds ?? [],
    nodes: overrides?.nodes ?? {},
    viewState: overrides?.viewState ?? { expandedNodeIds: [] },
  };
}
