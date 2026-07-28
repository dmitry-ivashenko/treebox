import type { DisplayMode } from "./types";

// Tiny pub/sub so a Shift-click on one pane's layout dropdown can switch every
// treebox pane on screen at once. Display mode lives in each useTreeboxInstance
// (local state, not the store), so there's nothing central to set — instead each
// mounted instance subscribes, and only mounted instances belong to the active
// mode's page, so a broadcast hits exactly the panes currently visible.
type Listener = (mode: DisplayMode) => void;

const listeners = new Set<Listener>();

export function subscribeDisplayMode(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function broadcastDisplayMode(mode: DisplayMode): void {
  for (const fn of listeners) fn(mode);
}
