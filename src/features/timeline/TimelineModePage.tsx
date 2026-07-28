import { useState, useCallback, useRef, useEffect } from "react";
import { useTreeboxStore } from "../../app/store";
import { useImageCapture } from "../../app/useImageCapture";
import { serializeTreeText } from "../../core/serializer/serializeTreeText";
import { TimelineStep } from "./TimelineStep";
import { TreePreview } from "./TreePreview";
import { TimelinePreviewText } from "./TimelinePreviewText";
import { ResizableDivider } from "../../app/ResizableDivider";
import type { TreeboxDocument } from "../../core/model/types";

type PreviewMode = "visual" | "text";

type StepState = {
  id: string;
  initialDoc: TreeboxDocument;
  initialText: string;
  label?: string;
};

let stepCounter = 0;
function nextStepId(): string {
  return `step-${++stepCounter}`;
}

type Props = { tabId: string };

export function TimelineModePage({ tabId }: Props) {
  const initTimelineIfNeeded = useTreeboxStore(s => s.initTimelineIfNeeded);
  const updateTimelineState = useTreeboxStore(s => s.updateTimelineState);
  const previewFullscreen = useTreeboxStore(s => s.previewFullscreen);
  const setPreviewFullscreen = useTreeboxStore(s => s.setPreviewFullscreen);
  const tab = useTreeboxStore(s => s.tabs.find(t => t.id === tabId));

  useEffect(() => { initTimelineIfNeeded(tabId); }, [tabId, initTimelineIfNeeded]);

  const timelineState = tab?.timeline;

  const [steps, setSteps] = useState<StepState[]>(() => {
    if (timelineState && timelineState.steps.length >= 2) {
      return timelineState.steps.map((s) => ({
        id: nextStepId(),
        initialDoc: s.document,
        initialText: s.textBuffer,
        label: s.label,
      }));
    }
    const editDoc = tab!.edit.document;
    const editText = tab!.edit.textBuffer;
    return [
      { id: nextStepId(), initialDoc: editDoc, initialText: editText },
      { id: nextStepId(), initialDoc: editDoc, initialText: editText },
    ];
  });

  const [previewMode, setPreviewMode] = useState<PreviewMode>("visual");
  const [previewHeight, setPreviewHeight] = useState(500);
  const [stepWidths, setStepWidths] = useState<Map<string, number>>(new Map());
  const visualRef = useRef<HTMLDivElement>(null);
  const { copyImage, downloadImage, status } = useImageCapture(visualRef);
  const docsRef = useRef<Map<number, TreeboxDocument>>(new Map());
  const [docsVersion, setDocsVersion] = useState(0);

  const handleDocChange = useCallback((index: number, doc: TreeboxDocument) => {
    docsRef.current.set(index, doc);
    setDocsVersion((v) => v + 1);
  }, []);

  const handleAddStepAfter = useCallback((afterIndex: number) => {
    setSteps((prev) => {
      const sourceDoc = docsRef.current.get(afterIndex) ?? prev[afterIndex].initialDoc;
      const text = serializeTreeText(sourceDoc);
      const newStep = { id: nextStepId(), initialDoc: sourceDoc, initialText: text };
      const result = [...prev];
      result.splice(afterIndex + 1, 0, newStep);
      return result;
    });
  }, []);

  const handleStepLabelChange = useCallback((index: number, label: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, label: label || undefined } : s)));
  }, []);

  const handleRemoveStep = useCallback((index: number) => {
    setSteps((prev) => {
      if (prev.length <= 2) return prev;
      docsRef.current.delete(index);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handlePreviewResize = useCallback((delta: number) => {
    setPreviewHeight((prev) => Math.max(80, Math.min(1000, prev - delta)));
  }, []);

  void docsVersion;
  const docs = steps.map((_, i) => docsRef.current.get(i) ?? steps[i].initialDoc);
  const anyLabel = steps.some((s) => s.label);
  // Re-persist when a label is edited or a step is added/removed, not just on
  // doc edits — labels live in `steps`, which docsVersion alone doesn't track.
  const labelsSig = steps.map((s) => s.label ?? "").join("");

  useEffect(() => {
    updateTimelineState(tabId, docs.map((doc, i) => ({
      document: doc,
      textBuffer: serializeTreeText(doc),
      label: steps[i]?.label,
    })));
  }, [docsVersion, labelsSig]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="timeline-workbench">
      {!previewFullscreen && (
        <>
          <div className="timeline-steps-container">
            <div className="timeline-steps">
              {steps.map((step, i) => (
                <div key={step.id} className="timeline-step-wrapper">
                  {i > 0 && (
                    <div className="timeline-between">
                      <div className="timeline-arrow-editor">→</div>
                      <button
                        className="timeline-insert-btn"
                        onClick={() => handleAddStepAfter(i - 1)}
                        title="Insert step"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <TimelineStep
                    initialDoc={step.initialDoc}
                    initialText={step.initialText}
                    stepIndex={i}
                    onDocChange={(doc) => handleDocChange(i, doc)}
                    onRemove={() => handleRemoveStep(i)}
                    canRemove={steps.length > 2}
                    width={stepWidths.get(step.id)}
                    onResize={(w) => setStepWidths(prev => new Map(prev).set(step.id, w))}
                    stepLabel={step.label}
                    onStepLabelChange={(l) => handleStepLabelChange(i, l)}
                  />
                </div>
              ))}
              <div className="timeline-add-end">
                <button
                  className="timeline-add-end-btn"
                  onClick={() => handleAddStepAfter(steps.length - 1)}
                  title="Add step"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <ResizableDivider direction="vertical" onResize={handlePreviewResize} />
        </>
      )}
      <div className="timeline-preview-zone" style={previewFullscreen ? undefined : { height: previewHeight }}>
        <div className="timeline-preview-header">
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
                  onClick={() => downloadImage("timeline-preview.png")}
                  title="Download image"
                >
                  ⬇
                </button>
              </div>
            )}
            <div className="timeline-preview-toggle">
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
        {previewMode === "visual" ? (
          <div className="timeline-preview-strip" ref={visualRef}>
            {docs.map((doc, i) => (
              <div key={i} className="timeline-preview-item">
                {i > 0 && <div className="timeline-preview-arrow">→</div>}
                <div className="timeline-preview-col">
                  {anyLabel && (
                    <div className="timeline-preview-label-slot">
                      {steps[i]?.label && <div className="timeline-preview-label">{steps[i].label}</div>}
                    </div>
                  )}
                  <div className="timeline-preview-tree">
                    <TreePreview doc={doc} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TimelinePreviewText docs={docs} />
        )}
      </div>
    </div>
  );
}
