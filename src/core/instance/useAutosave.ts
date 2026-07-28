import type { TreeboxInstance } from "./types";

export function useAutosave(_instance: TreeboxInstance) {
  // Autosave is now handled by the store's scheduleAutosave debouncer.
  // This hook is kept as a no-op for compatibility.
}
