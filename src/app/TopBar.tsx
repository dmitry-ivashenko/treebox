import { useState, useEffect } from "react";
import { useTreeboxStore, selectActiveTab } from "./store";
import type { TabState, WorkMode } from "../core/tabs/types";
import { ShareDialog } from "../features/share/ShareDialog";
import { HelpDialog } from "../features/help/HelpDialog";
import { useImportExport } from "../features/share/ImportExport";
import { createDocument } from "../core/model/createDocument";
import { serializeTreeText } from "../core/serializer/serializeTreeText";

export function TopBar() {
  const {
    tabs, activeTabId,
    switchTab, openTab, closeTab, reorderTabs, renameTab, duplicateTab,
    setMode, setShowLibrary,
  } = useTreeboxStore();
  const activeTab = useTreeboxStore(selectActiveTab);
  const mode = activeTab?.activeMode ?? "edit";

  const [showShare, setShowShare] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const { exportAsText, exportAsJson, importFile, importFromClipboard, copyToClipboard } = useImportExport();
  const [toast, setToast] = useState<string | null>(null);

  const handleNewTab = () => {
    const doc = createDocument({ title: "Untitled" });
    const text = serializeTreeText(doc);
    const tab: TabState = {
      id: doc.id,
      title: doc.title,
      activeMode: mode as WorkMode,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      edit: { document: doc, textBuffer: text },
      diff: null,
      timeline: null,
      animate: null,
    };
    openTab(tab);
  };

  const handleRenameSubmit = (tabId: string, newTitle: string) => {
    if (!newTitle.trim()) { setRenamingTabId(null); return; }
    renameTab(tabId, newTitle.trim());
    setRenamingTabId(null);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleCloseOtherTabs = (keepId: string) => {
    const toClose = tabs.filter(t => t.id !== keepId).map(t => t.id);
    for (const id of toClose) closeTab(id);
  };

  const handleCloseTabsToRight = (docId: string) => {
    const idx = tabs.findIndex(t => t.id === docId);
    const toClose = tabs.slice(idx + 1).map(t => t.id);
    for (const id of toClose) closeTab(id);
  };

  return (
    <>
      <div className="top-bar-wrapper">
        <header className="top-bar">
          <div className="top-bar-left">
            <span className="app-title">Treebox</span>
          </div>

          <div className="mode-switcher">
            <button className={`mode-switcher-btn ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>
              Edit
            </button>
            <button className={`mode-switcher-btn ${mode === "diff" ? "active" : ""}`} onClick={() => setMode("diff")}>
              Diff
            </button>
            <button className={`mode-switcher-btn ${mode === "timeline" ? "active" : ""}`} onClick={() => setMode("timeline")}>
              Timeline
            </button>
            <button className={`mode-switcher-btn ${mode === "animate" ? "active" : ""}`} onClick={() => setMode("animate")}>
              Animate
            </button>
          </div>

          <div className="top-bar-right-group">
            <button className="btn" onClick={async () => {
              const ok = await copyToClipboard();
              if (ok) { setToast("Copied!"); setTimeout(() => setToast(null), 1500); }
            }}>
              Copy
            </button>
            <button className="btn" onClick={async () => {
              const err = await importFromClipboard();
              if (err) { setToast(err); setTimeout(() => setToast(null), 3000); }
            }}>
              Paste
            </button>
            <button className="btn" onClick={importFile}>
              Import file
            </button>
            <button className="btn" onClick={exportAsText}>
              Export TXT
            </button>
            <button className="btn" onClick={exportAsJson}>
              Export JSON
            </button>
            {mode === "animate" && (
              <button className="btn" onClick={() => useTreeboxStore.setState({ gifExportRequested: true })}>
                Export GIF
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowShare(true)}>
              Share
            </button>
            <button className="btn" onClick={() => setShowHelp(true)}>
              Help
            </button>
          </div>
        </header>

        <div className="tab-bar">
          <button className="tab-bar-new" onClick={handleNewTab} title="New document">
            + New
          </button>
          <div className="tab-bar-separator" />
          <div className="tab-bar-tabs">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`doc-tab ${tab.id === activeTabId ? "active" : ""} ${dropTargetId === tab.id && dragTabId !== tab.id ? "drop-target" : ""}`}
                onClick={() => switchTab(tab.id)}
                onDoubleClick={() => {
                  setRenamingTabId(tab.id);
                  setRenameValue(tab.title);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTabContextMenu({ id: tab.id, x: e.clientX, y: e.clientY });
                }}
                draggable={!renamingTabId}
                onDragStart={(e) => {
                  setDragTabId(tab.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTargetId(tab.id);
                }}
                onDragLeave={() => setDropTargetId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragTabId) reorderTabs(dragTabId, tab.id);
                  setDragTabId(null);
                  setDropTargetId(null);
                }}
                onDragEnd={() => {
                  setDragTabId(null);
                  setDropTargetId(null);
                }}
              >
                {renamingTabId === tab.id ? (
                  <input
                    className="doc-tab-rename"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(tab.id, renameValue)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit(tab.id, renameValue);
                      if (e.key === "Escape") setRenamingTabId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="doc-tab-title">{tab.title}</span>
                )}
                {tabs.length > 1 && !renamingTabId && (
                  <button
                    className="doc-tab-close"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="tab-bar-separator" />
          <button className="tab-bar-library" onClick={() => setShowLibrary(true)} title="All documents">
            Library
          </button>
        </div>
      </div>
      {showShare && <ShareDialog onClose={() => setShowShare(false)} />}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
      {tabContextMenu && (
        <TabContextMenu
          tabId={tabContextMenu.id}
          x={tabContextMenu.x}
          y={tabContextMenu.y}
          tabCount={tabs.length}
          onClose={() => setTabContextMenu(null)}
          onRename={() => {
            const tab = tabs.find((t) => t.id === tabContextMenu.id);
            if (tab) { setRenamingTabId(tab.id); setRenameValue(tab.title); }
            setTabContextMenu(null);
          }}
          onDuplicate={() => { duplicateTab(tabContextMenu.id); setTabContextMenu(null); }}
          onClose_tab={() => {
            closeTab(tabContextMenu.id);
            setTabContextMenu(null);
          }}
          onCloseOthers={() => { handleCloseOtherTabs(tabContextMenu.id); setTabContextMenu(null); }}
          onCloseToRight={() => { handleCloseTabsToRight(tabContextMenu.id); setTabContextMenu(null); }}
        />
      )}
      {toast && <div className={`toast-notification ${toast === "Copied!" ? "toast-success" : "toast-error"}`}>{toast}</div>}
    </>
  );
}

function TabContextMenu({
  x, y, tabCount, onClose, onRename, onDuplicate, onClose_tab, onCloseOthers, onCloseToRight
}: {
  tabId: string;
  x: number;
  y: number;
  tabCount: number;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onClose_tab: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
}) {
  useEffect(() => {
    const handler = () => { onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    { label: "Rename", action: onRename },
    { label: "Duplicate", action: onDuplicate },
    { label: "---" },
    { label: "Close", action: onClose_tab, disabled: tabCount <= 1 },
    { label: "Close Others", action: onCloseOthers, disabled: tabCount <= 1 },
    { label: "Close to the Right", action: onCloseToRight },
  ];

  return (
    <div className="context-menu" style={{ top: y, left: x }} onMouseDown={(e) => e.stopPropagation()}>
      {items.map((item, i) =>
        item.label === "---" ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <div
            key={i}
            className={`context-menu-item ${item.disabled ? "disabled" : ""}`}
            onClick={item.disabled ? undefined : item.action}
          >
            {item.label}
          </div>
        )
      )}
    </div>
  );
}
