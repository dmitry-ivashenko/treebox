import type { TreeboxDocument } from "../model/types";

export type WorkMode = "edit" | "diff" | "timeline" | "animate";

export type ModeSlot = {
  document: TreeboxDocument;
  textBuffer: string;
  /** Optional human-readable label (used by Timeline steps; ignored by diff). */
  label?: string;
};

export type DiffModeState = {
  left: ModeSlot;
  right: ModeSlot;
};

export type TimelineModeState = {
  steps: ModeSlot[];
};

export type EasingType = "ease-in-out" | "ease-in" | "ease-out" | "linear";

export type AnimateKeyframe = {
  id: string;
  time: number;
  document: TreeboxDocument;
  textBuffer: string;
  label?: string;
  holdBefore?: number;
  easing?: EasingType;
};

export type TimelineLabel = {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
};

export type AnimateModeState = {
  keyframes: AnimateKeyframe[];
  labels: TimelineLabel[];
  duration: number;
  loop: boolean;
  speed: number;
};

export type TabState = {
  id: string;
  title: string;
  activeMode: WorkMode;
  createdAt: string;
  updatedAt: string;
  edit: ModeSlot;
  diff: DiffModeState | null;
  timeline: TimelineModeState | null;
  animate: AnimateModeState | null;
};
