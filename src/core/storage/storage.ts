import type { TreeboxDocument } from "../model/types";
import type { TabState, WorkMode } from "../tabs/types";

const PREFIX = "treebox:v2";

function key(suffix: string): string {
  return `${PREFIX}:${suffix}`;
}

// --- Index ---

export type TabsIndex = {
  schemaVersion: 2;
  activeTabId?: string;
  openTabIds: string[];
};

export function loadTabsIndex(): TabsIndex | null {
  try {
    const raw = localStorage.getItem(key("index"));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTabsIndex(index: TabsIndex): void {
  localStorage.setItem(key("index"), JSON.stringify(index));
}

// --- Tab Records ---

export type SavedTabRecord = {
  schemaVersion: 2;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  activeMode: WorkMode;
  edit: { document: TreeboxDocument; textBuffer: string };
  diff: { left: { document: TreeboxDocument; textBuffer: string }; right: { document: TreeboxDocument; textBuffer: string } } | null;
  timeline: { steps: Array<{ document: TreeboxDocument; textBuffer: string; label?: string }> } | null;
  animate: { keyframes: Array<{ id: string; time: number; document: TreeboxDocument; textBuffer: string; label?: string; holdBefore?: number }>; duration: number; loop: boolean; speed: number } | null;
};

export function loadTabRecord(tabId: string): SavedTabRecord | null {
  try {
    const raw = localStorage.getItem(key(`tab:${tabId}`));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTabRecord(tab: SavedTabRecord): void {
  localStorage.setItem(key(`tab:${tab.id}`), JSON.stringify(tab));
}

export function deleteTabRecord(tabId: string): void {
  localStorage.removeItem(key(`tab:${tabId}`));
}

export function tabStateToRecord(tab: TabState): SavedTabRecord {
  return {
    schemaVersion: 2,
    id: tab.id,
    title: tab.title,
    createdAt: tab.createdAt,
    updatedAt: tab.updatedAt,
    activeMode: tab.activeMode,
    edit: tab.edit,
    diff: tab.diff,
    timeline: tab.timeline,
    animate: tab.animate,
  };
}

export function recordToTabState(record: SavedTabRecord): TabState {
  return {
    id: record.id,
    title: record.title,
    activeMode: record.activeMode,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    edit: record.edit,
    diff: record.diff,
    timeline: record.timeline,
    animate: (record as any).animate
      ? { ...(record as any).animate, labels: (record as any).animate.labels ?? [] }
      : null,
  };
}

// --- Load ---

export function loadStorage(): { index: TabsIndex; tabs: TabState[] } {
  const v2Index = loadTabsIndex();
  if (!v2Index) return { index: { schemaVersion: 2, openTabIds: [] }, tabs: [] };
  const tabs: TabState[] = [];
  for (const id of v2Index.openTabIds) {
    const record = loadTabRecord(id);
    if (record) tabs.push(recordToTabState(record));
  }
  return { index: v2Index, tabs };
}

// --- Settings (unchanged) ---

export function loadSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(key("settings"));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveSettings(settings: Record<string, unknown>): void {
  localStorage.setItem(key("settings"), JSON.stringify(settings));
}
