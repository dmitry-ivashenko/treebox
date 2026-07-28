import { useState, useEffect } from "react";
import { useTreeboxStore } from "../../app/store";
import type { TabState } from "../../core/tabs/types";
import {
  loadTabsIndex,
  loadTabRecord,
  recordToTabState,
  deleteTabRecord,
  saveTabsIndex,
  saveTabRecord,
  tabStateToRecord,
} from "../../core/storage/storage";
import { createDocument } from "../../core/model/createDocument";
import { serializeTreeText } from "../../core/serializer/serializeTreeText";

type LibraryItem = {
  id: string;
  title: string;
  updatedAt: string;
  nodeCount: number;
  previewText: string;
};

export function LibraryDialog() {
  const { tabs, openTab, switchTab, setShowLibrary, activeTabId } = useTreeboxStore();
  const [allItems, setAllItems] = useState<LibraryItem[]>([]);

  const refresh = () => {
    const index = loadTabsIndex();
    if (!index) { setAllItems([]); return; }
    const items: LibraryItem[] = [];
    for (const id of index.openTabIds) {
      const record = loadTabRecord(id);
      if (record) {
        items.push({
          id: record.id,
          title: record.title,
          updatedAt: record.updatedAt,
          nodeCount: Object.keys(record.edit.document.nodes).length,
          previewText: record.edit.textBuffer.slice(0, 200),
        });
      }
    }
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setAllItems(items);
  };

  useEffect(() => { refresh(); }, []);

  const handleOpen = (itemId: string) => {
    const existing = tabs.find(t => t.id === itemId);
    if (existing) {
      switchTab(itemId);
    } else {
      const record = loadTabRecord(itemId);
      if (record) openTab(recordToTabState(record));
    }
    setShowLibrary(false);
  };

  const handleNew = () => {
    const doc = createDocument({ title: "Untitled" });
    const text = serializeTreeText(doc);
    const tab: TabState = {
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
    openTab(tab);
    setShowLibrary(false);
  };

  const handleDuplicate = (item: LibraryItem) => {
    const record = loadTabRecord(item.id);
    if (!record) return;
    const newDoc = createDocument({ title: `${item.title} (copy)` });
    const tab: TabState = {
      ...recordToTabState(record),
      id: newDoc.id,
      title: newDoc.title,
      createdAt: newDoc.createdAt,
      updatedAt: newDoc.createdAt,
      edit: {
        document: { ...structuredClone(record.edit.document), id: newDoc.id, title: newDoc.title },
        textBuffer: record.edit.textBuffer,
      },
    };
    saveTabRecord(tabStateToRecord(tab));
    const index = loadTabsIndex();
    if (index) {
      index.openTabIds.push(tab.id);
      saveTabsIndex(index);
    }
    refresh();
  };

  const handleDelete = (itemId: string) => {
    if (allItems.length <= 1) return;
    deleteTabRecord(itemId);
    const index = loadTabsIndex();
    if (index) {
      index.openTabIds = index.openTabIds.filter(id => id !== itemId);
      saveTabsIndex(index);
    }
    if (tabs.find(t => t.id === itemId)) {
      useTreeboxStore.getState().closeTab(itemId);
    }
    refresh();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="modal-overlay" onClick={() => setShowLibrary(false)}>
      <div className="library-dialog" onClick={e => e.stopPropagation()}>
        <div className="library-toolbar">
          <span className="library-title">Library</span>
          <div className="library-toolbar-actions">
            <button className="btn btn-primary" onClick={handleNew}>
              + New Document
            </button>
            <button className="btn" onClick={() => setShowLibrary(false)}>
              Close
            </button>
          </div>
        </div>
        <div className="library-grid">
          {allItems.map((item) => (
            <div
              key={item.id}
              className={`library-card ${item.id === activeTabId ? "active" : ""}`}
              onClick={() => handleOpen(item.id)}
            >
              <div className="library-card-header">
                <span className="library-card-title">{item.title}</span>
                <span className="library-card-meta">
                  {item.nodeCount} nodes
                </span>
              </div>
              <pre className="library-card-preview">
                {item.previewText || "Empty document"}
              </pre>
              <div className="library-card-footer">
                <span className="library-card-date">
                  {formatDate(item.updatedAt)}
                </span>
                <div className="library-card-actions">
                  <button
                    className="btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(item);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
