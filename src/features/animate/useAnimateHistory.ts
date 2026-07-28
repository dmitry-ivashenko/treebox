import { useCallback, useRef, useState } from "react";
import type { AnimateModeState } from "../../core/tabs/types";

const MAX_ANIMATE_UNDO = 100;

export type AnimateHistory = {
  /** Snapshot the current state, then apply `next`. Use for structural edits. */
  commit: (next: AnimateModeState) => void;
  /** Restore the previous snapshot. Returns true if something was undone. */
  undo: () => boolean;
  /** Re-apply the next snapshot. Returns true if something was redone. */
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * Snapshot-based undo/redo for the whole animate-mode state (keyframes, labels,
 * duration, loop, speed). Mirrors the ref-based stacks in useTreeboxInstance.
 *
 * `undo`/`redo` are invoked later from the global keydown listener, so they must
 * never close over `animState` — they read `stateRef.current` (the latest state).
 */
export function useAnimateHistory(
  animState: AnimateModeState,
  applyState: (next: AnimateModeState) => void,
): AnimateHistory {
  const stateRef = useRef(animState);
  stateRef.current = animState;

  const pastRef = useRef<AnimateModeState[]>([]);
  const futureRef = useRef<AnimateModeState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const commit = useCallback((next: AnimateModeState) => {
    pastRef.current.push(structuredClone(stateRef.current));
    if (pastRef.current.length > MAX_ANIMATE_UNDO) pastRef.current.shift();
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    applyState(next);
  }, [applyState]);

  const undo = useCallback((): boolean => {
    const entry = pastRef.current.pop();
    if (!entry) return false;
    futureRef.current.push(structuredClone(stateRef.current));
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    applyState(entry);
    return true;
  }, [applyState]);

  const redo = useCallback((): boolean => {
    const entry = futureRef.current.pop();
    if (!entry) return false;
    pastRef.current.push(structuredClone(stateRef.current));
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    applyState(entry);
    return true;
  }, [applyState]);

  return { commit, undo, redo, canUndo, canRedo };
}
