import { useState, useCallback, useMemo } from "react";
import { TreeboxTextEditor } from "./TreeboxTextEditor";
import { DisplayModeDropdown } from "./DisplayModeDropdown";
import { ExplorerProvider } from "../explorer/ExplorerContext";
import { ExplorerPaneInner } from "../explorer/ExplorerPane";
import { ResizableDivider } from "../../app/ResizableDivider";
import type { TreeboxInstance } from "../../core/instance/types";
import type { ExplorerContextValue } from "../explorer/ExplorerContext";

type Props = {
  instance: TreeboxInstance;
  label?: string;
  showDisplayToggle?: boolean;
  headerExtra?: React.ReactNode;
  /** Rendered right after the label (left side), before the spacer. */
  headerLabelExtra?: React.ReactNode;
};

export function TreeboxPane({ instance, label, showDisplayToggle = true, headerExtra, headerLabelExtra }: Props) {
  const [splitPercent, setSplitPercent] = useState(50);

  const handleResize = useCallback((delta: number) => {
    setSplitPercent((prev) => {
      return Math.max(15, Math.min(85, prev + delta / 4));
    });
  }, []);

  const explorerContext: ExplorerContextValue = useMemo(() => ({
    doc: instance.doc,
    applyExplorerAdd: instance.applyExplorerAdd,
    applyExplorerDelete: instance.applyExplorerDelete,
    applyExplorerRename: instance.applyExplorerRename,
    applyExplorerMove: instance.applyExplorerMove,
    applyExplorerToggleCollapse: instance.applyExplorerToggleCollapse,
    duplicateSubtree: instance.duplicateSubtree,
    setSelectedNode: instance.setSelectedNode,
    collapseAll: instance.collapseAll,
    expandAll: instance.expandAll,
    updateNode: instance.updateNode,
    setText: instance.setText,
    resetDocument: instance.resetDocument,
  }), [
    instance.doc,
    instance.applyExplorerAdd,
    instance.applyExplorerDelete,
    instance.applyExplorerRename,
    instance.applyExplorerMove,
    instance.applyExplorerToggleCollapse,
    instance.duplicateSubtree,
    instance.setSelectedNode,
    instance.collapseAll,
    instance.expandAll,
    instance.updateNode,
    instance.setText,
    instance.resetDocument,
  ]);

  const { displayMode } = instance;

  return (
    <div className={`treebox-pane treebox-pane-${displayMode}`}>
      {(label || showDisplayToggle || headerExtra || headerLabelExtra) && (
        <div className="treebox-pane-header">
          {label && <span className="treebox-pane-label">{label}</span>}
          {headerLabelExtra}
          <div className="treebox-pane-header-spacer" />
          {headerExtra}
          {showDisplayToggle && (
            <DisplayModeDropdown value={displayMode} onChange={instance.setDisplayMode} />
          )}
        </div>
      )}
      <div className="treebox-pane-content">
        {displayMode === "code" && (
          <TreeboxTextEditor text={instance.textBuffer} onTextChange={instance.setText} />
        )}
        {displayMode === "explorer" && (
          <ExplorerProvider value={explorerContext}>
            <ExplorerPaneInner />
          </ExplorerProvider>
        )}
        {displayMode === "split-v" && (
          <div className="treebox-split-v">
            <div className="treebox-split-pane" style={{ flex: `0 0 ${splitPercent}%` }}>
              <TreeboxTextEditor text={instance.textBuffer} onTextChange={instance.setText} />
            </div>
            <ResizableDivider direction="horizontal" onResize={handleResize} />
            <div className="treebox-split-pane" style={{ flex: `0 0 ${100 - splitPercent}%` }}>
              <ExplorerProvider value={explorerContext}>
                <ExplorerPaneInner />
              </ExplorerProvider>
            </div>
          </div>
        )}
        {displayMode === "split-h" && (
          <div className="treebox-split-h">
            <div className="treebox-split-pane" style={{ flex: `0 0 ${splitPercent}%` }}>
              <TreeboxTextEditor text={instance.textBuffer} onTextChange={instance.setText} />
            </div>
            <ResizableDivider direction="vertical" onResize={handleResize} />
            <div className="treebox-split-pane" style={{ flex: `0 0 ${100 - splitPercent}%` }}>
              <ExplorerProvider value={explorerContext}>
                <ExplorerPaneInner />
              </ExplorerProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
