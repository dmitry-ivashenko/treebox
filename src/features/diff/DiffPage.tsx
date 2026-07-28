import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTreeboxStore } from "../../app/store";
import { diffDocuments } from "../../core/diff/diffDocuments";
import { useTreeboxInstance } from "../../core/instance/useTreeboxInstance";
import { useImageCapture } from "../../app/useImageCapture";
import { TreeboxPane } from "../treebox/TreeboxPane";
import { ResizableDivider } from "../../app/ResizableDivider";
import { DiffPreviewVisual } from "./DiffPreviewVisual";
import { DiffPreviewText } from "./DiffPreviewText";
import type { TreeboxDiff } from "../../core/diff/diffTypes";

type PreviewMode = "visual" | "text";
type Props = { tabId: string };

export function DiffPage({ tabId }: Props) {
  const initDiffIfNeeded = useTreeboxStore(s => s.initDiffIfNeeded);
  const updateDiffState = useTreeboxStore(s => s.updateDiffState);
  const previewFullscreen = useTreeboxStore(s => s.previewFullscreen);
  const setPreviewFullscreen = useTreeboxStore(s => s.setPreviewFullscreen);
  const tab = useTreeboxStore(s => s.tabs.find(t => t.id === tabId));

  useEffect(() => { initDiffIfNeeded(tabId); }, [tabId, initDiffIfNeeded]);

  const diffState = tab?.diff;
  const leftInitial = useRef(diffState?.left).current;
  const rightInitial = useRef(diffState?.right).current;

  const [previewMode, setPreviewMode] = useState<PreviewMode>("visual");
  const [previewHeight, setPreviewHeight] = useState(500);
  const visualRef = useRef<HTMLDivElement>(null);
  const { copyImage, downloadImage, status } = useImageCapture(visualRef);

  const handlePreviewResize = useCallback((delta: number) => {
    setPreviewHeight((prev) => Math.max(80, Math.min(1000, prev - delta)));
  }, []);

  const leftInstance = useTreeboxInstance({
    initialDoc: leftInitial?.document ?? tab!.edit.document,
    initialText: leftInitial?.textBuffer ?? tab!.edit.textBuffer,
    defaultDisplayMode: "explorer",
    instanceId: `diff-left-${tabId}`,
  });

  const rightInstance = useTreeboxInstance({
    initialDoc: rightInitial?.document ?? tab!.edit.document,
    initialText: rightInitial?.textBuffer ?? tab!.edit.textBuffer,
    defaultDisplayMode: "explorer",
    instanceId: `diff-right-${tabId}`,
  });

  useEffect(() => {
    updateDiffState(tabId,
      { document: leftInstance.doc, textBuffer: leftInstance.textBuffer },
      { document: rightInstance.doc, textBuffer: rightInstance.textBuffer },
    );
  }, [leftInstance.doc, leftInstance.textBuffer, rightInstance.doc, rightInstance.textBuffer, tabId, updateDiffState]);

  const diff: TreeboxDiff = useMemo(
    () => diffDocuments(leftInstance.doc, rightInstance.doc),
    [leftInstance.doc, rightInstance.doc]
  );

  return (
    <div className="diff-workbench">
      {!previewFullscreen && (
        <>
          <div className="diff-editing-zone">
            <TreeboxPane instance={leftInstance} label="Before" />
            <div className="diff-zone-divider" />
            <TreeboxPane instance={rightInstance} label="After" />
          </div>
          <ResizableDivider direction="vertical" onResize={handlePreviewResize} />
        </>
      )}
      <div className="diff-preview-zone" style={previewFullscreen ? undefined : { height: previewHeight }}>
        <div className="diff-preview-header">
          <span className="diff-preview-title">Preview</span>
          <div className="diff-preview-actions">
            {previewMode === "visual" && (
              <div className="preview-image-actions">
                <button
                  className="btn btn-sm btn-icon"
                  onClick={copyImage}
                  title="Copy image"
                >
                  {status === "copied" ? "✓" : "📋"}
                </button>
                <button
                  className="btn btn-sm btn-icon"
                  onClick={() => downloadImage("diff-preview.png")}
                  title="Download image"
                >
                  ⬇
                </button>
              </div>
            )}
            <div className="diff-preview-toggle">
              <button
                className={`btn btn-sm ${previewMode === "visual" ? "btn-active" : ""}`}
                onClick={() => setPreviewMode("visual")}
              >
                Visual
              </button>
              <button
                className={`btn btn-sm ${previewMode === "text" ? "btn-active" : ""}`}
                onClick={() => setPreviewMode("text")}
              >
                Text
              </button>
            </div>
            <button
              className="btn btn-sm btn-icon"
              onClick={() => setPreviewFullscreen(!previewFullscreen)}
              title={previewFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {previewFullscreen ? "✕" : "⛶"}
            </button>
          </div>
        </div>
        <div className="diff-preview-content">
          {previewMode === "visual" ? (
            <div ref={visualRef}>
              <DiffPreviewVisual leftDoc={leftInstance.doc} rightDoc={rightInstance.doc} diff={diff} />
            </div>
          ) : (
            <DiffPreviewText leftDoc={leftInstance.doc} rightDoc={rightInstance.doc} diff={diff} />
          )}
        </div>
      </div>
    </div>
  );
}
