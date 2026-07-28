import { useEffect, useRef, useCallback } from "react";
import { useTreeboxInstance } from "../../core/instance/useTreeboxInstance";
import { TreeboxPane } from "../treebox/TreeboxPane";
import type { TreeboxDocument } from "../../core/model/types";

type Props = {
  initialDoc: TreeboxDocument;
  initialText: string;
  stepIndex: number;
  onDocChange: (doc: TreeboxDocument) => void;
  onRemove: () => void;
  canRemove: boolean;
  width?: number;
  onResize?: (width: number) => void;
  stepLabel?: string;
  onStepLabelChange: (label: string) => void;
};

export function TimelineStep({ initialDoc, initialText, stepIndex, onDocChange, onRemove, canRemove, width, onResize, stepLabel, onStepLabelChange }: Props) {
  const instance = useTreeboxInstance({
    initialDoc,
    initialText,
    defaultDisplayMode: "explorer",
    instanceId: `timeline-${stepIndex}`,
  });

  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;

  useEffect(() => {
    onDocChangeRef.current(instance.doc);
  }, [instance.doc]);

  const stepRef = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = stepRef.current?.offsetWidth ?? 400;

    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(300, startWidth + ev.clientX - startX);
      onResizeRef.current?.(newWidth);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const style = width ? { width, flex: "none" } as const : undefined;

  return (
    <div className="timeline-step" ref={stepRef} style={style}>
      <TreeboxPane
        instance={instance}
        showDisplayToggle={true}
        label={`Step ${stepIndex + 1}`}
        headerLabelExtra={
          <input
            className="timeline-step-label-input"
            placeholder="Label…"
            value={stepLabel ?? ""}
            onChange={(e) => onStepLabelChange(e.target.value)}
          />
        }
        headerExtra={canRemove ? (
          <button className="timeline-step-remove" onClick={onRemove} title="Remove step">×</button>
        ) : undefined}
      />
      <div className="timeline-step-resize" onMouseDown={handleResizeStart} />
    </div>
  );
}
