import { useTreeboxInstance } from "../../core/instance/useTreeboxInstance";
import type { TreeboxInstance } from "../../core/instance/types";
import type { TreeboxDocument } from "../../core/model/types";

export type DiffDocState = TreeboxInstance;

export function useDiffDocState(
  initialDoc: TreeboxDocument,
  initialText: string
): DiffDocState {
  return useTreeboxInstance({
    initialDoc,
    initialText,
    defaultDisplayMode: "split-h",
  });
}
