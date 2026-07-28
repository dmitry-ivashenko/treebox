import { create } from "zustand";
import type { TabState, WorkMode, ModeSlot, AnimateModeState } from "../core/tabs/types";
import { createDocument } from "../core/model/createDocument";
import { generateNodeId } from "../core/model/createNode";
import { serializeTreeText } from "../core/serializer/serializeTreeText";
import {
  loadStorage,
  saveTabsIndex,
  saveTabRecord,
  tabStateToRecord,
  deleteTabRecord,
  type TabsIndex,
} from "../core/storage/storage";

export type { TabState, WorkMode, ModeSlot };

type TabsStore = {
  tabs: TabState[];
  activeTabId: string | null;
  showLibrary: boolean;
  previewFullscreen: boolean;
  autoplay: boolean;
  gifExportRequested: boolean;
  importGeneration: number;

  openTab: (tab: TabState) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  reorderTabs: (fromId: string, toId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  duplicateTab: (tabId: string) => void;

  setMode: (mode: WorkMode) => void;
  initDiffIfNeeded: (tabId: string) => void;
  initTimelineIfNeeded: (tabId: string) => void;
  initAnimateIfNeeded: (tabId: string) => void;

  updateEditState: (tabId: string, state: ModeSlot) => void;
  updateDiffState: (tabId: string, left: ModeSlot, right: ModeSlot) => void;
  updateTimelineState: (tabId: string, steps: ModeSlot[]) => void;
  updateAnimateState: (tabId: string, state: AnimateModeState) => void;

  setShowLibrary: (show: boolean) => void;
  setPreviewFullscreen: (fs: boolean) => void;
  bumpImportGeneration: () => void;
};

function createDefaultTab(): TabState {
  const doc = createDocument({ title: "Untitled" });
  const text = serializeTreeText(doc);
  return {
    id: doc.id,
    title: doc.title,
    activeMode: "edit",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    edit: { document: doc, textBuffer: text },
    diff: null,
    timeline: null,
    animate: null,
  };
}

function loadInitialState(): { tabs: TabState[]; activeTabId: string | null } {
  const { index, tabs } = loadStorage();
  if (tabs.length === 0) {
    const tab = createDefaultTab();
    return { tabs: [tab], activeTabId: tab.id };
  }
  return { tabs, activeTabId: index.activeTabId ?? tabs[0].id };
}

const initial = loadInitialState();

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const state = useTreeboxStore.getState();
    const index: TabsIndex = {
      schemaVersion: 2,
      activeTabId: state.activeTabId ?? undefined,
      openTabIds: state.tabs.map(t => t.id),
    };
    saveTabsIndex(index);
    for (const tab of state.tabs) {
      saveTabRecord(tabStateToRecord(tab));
    }
  }, 500);
}

function updateTab(tabs: TabState[], tabId: string, updater: (t: TabState) => TabState): TabState[] {
  return tabs.map(t => t.id === tabId ? updater(t) : t);
}

export const useTreeboxStore = create<TabsStore>((set, get) => ({
  tabs: initial.tabs,
  activeTabId: initial.activeTabId,
  showLibrary: false,
  previewFullscreen: false,
  autoplay: false,
  gifExportRequested: false,
  importGeneration: 0,

  openTab: (tab: TabState) => {
    const { tabs } = get();
    if (tabs.some(t => t.id === tab.id)) {
      set({ activeTabId: tab.id });
    } else {
      set({ tabs: [...tabs, tab], activeTabId: tab.id });
    }
    scheduleAutosave();
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    let newActiveId = activeTabId;
    if (activeTabId === tabId) {
      newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null;
    }
    set({ tabs: newTabs, activeTabId: newActiveId });
    deleteTabRecord(tabId);
    scheduleAutosave();
  },

  switchTab: (tabId: string) => {
    set({ activeTabId: tabId });
    scheduleAutosave();
  },

  reorderTabs: (fromId: string, toId: string) => {
    const { tabs } = get();
    const fromIdx = tabs.findIndex(t => t.id === fromId);
    const toIdx = tabs.findIndex(t => t.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(fromIdx, 1);
    newTabs.splice(toIdx, 0, moved);
    set({ tabs: newTabs });
    scheduleAutosave();
  },

  renameTab: (tabId: string, title: string) => {
    set(state => ({
      tabs: updateTab(state.tabs, tabId, t => {
        const doc = { ...t.edit.document, title };
        return { ...t, title, edit: { ...t.edit, document: doc } };
      }),
    }));
    scheduleAutosave();
  },

  duplicateTab: (tabId: string) => {
    const { tabs } = get();
    const source = tabs.find(t => t.id === tabId);
    if (!source) return;
    const newDoc = createDocument({ title: `${source.title} (copy)` });
    const newTab: TabState = {
      ...structuredClone(source),
      id: newDoc.id,
      title: newDoc.title,
      createdAt: newDoc.createdAt,
      updatedAt: newDoc.updatedAt,
      edit: {
        document: { ...structuredClone(source.edit.document), id: newDoc.id, title: newDoc.title },
        textBuffer: source.edit.textBuffer,
      },
    };
    set({ tabs: [...tabs, newTab], activeTabId: newTab.id });
    scheduleAutosave();
  },

  setMode: (mode: WorkMode) => {
    const { activeTabId } = get();
    if (!activeTabId) return;
    set(state => ({
      tabs: updateTab(state.tabs, activeTabId, t => ({ ...t, activeMode: mode })),
    }));
    scheduleAutosave();
  },

  initDiffIfNeeded: (tabId: string) => {
    const tab = get().tabs.find(t => t.id === tabId);
    if (!tab || tab.diff !== null) return;
    const editDoc = tab.edit.document;
    const editText = tab.edit.textBuffer;
    set(state => ({
      tabs: updateTab(state.tabs, tabId, t => ({
        ...t,
        diff: {
          left: { document: structuredClone(editDoc), textBuffer: editText },
          right: { document: structuredClone(editDoc), textBuffer: editText },
        },
      })),
    }));
    scheduleAutosave();
  },

  initTimelineIfNeeded: (tabId: string) => {
    const tab = get().tabs.find(t => t.id === tabId);
    if (!tab || tab.timeline !== null) return;
    const editDoc = tab.edit.document;
    const editText = tab.edit.textBuffer;
    set(state => ({
      tabs: updateTab(state.tabs, tabId, t => ({
        ...t,
        timeline: {
          steps: [
            { document: structuredClone(editDoc), textBuffer: editText },
            { document: structuredClone(editDoc), textBuffer: editText },
          ],
        },
      })),
    }));
    scheduleAutosave();
  },

  updateEditState: (tabId: string, state: ModeSlot) => {
    set(s => ({
      tabs: updateTab(s.tabs, tabId, t => ({
        ...t,
        title: state.document.title,
        updatedAt: new Date().toISOString(),
        edit: state,
      })),
    }));
    scheduleAutosave();
  },

  updateDiffState: (tabId: string, left: ModeSlot, right: ModeSlot) => {
    set(s => ({
      tabs: updateTab(s.tabs, tabId, t => ({
        ...t,
        updatedAt: new Date().toISOString(),
        diff: { left, right },
      })),
    }));
    scheduleAutosave();
  },

  updateTimelineState: (tabId: string, steps: ModeSlot[]) => {
    set(s => ({
      tabs: updateTab(s.tabs, tabId, t => ({
        ...t,
        updatedAt: new Date().toISOString(),
        timeline: { steps },
      })),
    }));
    scheduleAutosave();
  },

  initAnimateIfNeeded: (tabId: string) => {
    const tab = get().tabs.find(t => t.id === tabId);
    if (!tab || tab.animate !== null) return;
    let keyframes;
    if (tab.timeline && tab.timeline.steps.length >= 2) {
      keyframes = tab.timeline.steps.map((step, i) => ({
        id: generateNodeId(),
        time: i * 2,
        document: structuredClone(step.document),
        textBuffer: step.textBuffer,
      }));
    } else {
      keyframes = [{
        id: generateNodeId(),
        time: 0,
        document: structuredClone(tab.edit.document),
        textBuffer: tab.edit.textBuffer,
      }];
    }

    const duration = keyframes.length > 1 ? keyframes[keyframes.length - 1].time + 2 : 4;
    set(state => ({
      tabs: updateTab(state.tabs, tabId, t => ({
        ...t,
        animate: { keyframes, labels: [], duration, loop: true, speed: 1 },
      })),
    }));
    scheduleAutosave();
  },

  updateAnimateState: (tabId: string, animateState: AnimateModeState) => {
    set(s => ({
      tabs: updateTab(s.tabs, tabId, t => ({
        ...t,
        updatedAt: new Date().toISOString(),
        animate: animateState,
      })),
    }));
    scheduleAutosave();
  },

  setShowLibrary: (show: boolean) => {
    set({ showLibrary: show });
  },

  setPreviewFullscreen: (fs: boolean) => {
    set({ previewFullscreen: fs });
  },

  bumpImportGeneration: () => {
    set(s => ({ importGeneration: s.importGeneration + 1 }));
  },
}));

// --- Selectors ---

export function selectActiveTab(state: TabsStore): TabState | null {
  return state.tabs.find(t => t.id === state.activeTabId) ?? null;
}

export function selectActiveMode(state: TabsStore): WorkMode {
  return selectActiveTab(state)?.activeMode ?? "edit";
}
