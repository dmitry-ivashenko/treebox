import { useRef, useState, useCallback, useEffect } from "react";
import type { AnimateKeyframe, EasingType, TimelineLabel } from "../../core/tabs/types";

type Props = {
  keyframes: AnimateKeyframe[];
  duration: number;
  playhead: number;
  onSeek: (time: number) => void;
  onKeyframeDrag: (kfId: string, newTime: number) => void;
  onKeyframeSelect: (kfId: string) => void;
  onKeyframeDelete: (kfId: string) => void;
  onKeyframeCreate: () => void;
  onKeyframeDuplicate: () => void;
  onDurationChange: (newDuration: number) => void;
  selectedKeyframeId?: string;
  selectedKf?: AnimateKeyframe;
  onEasingChange?: (kfId: string, easing: EasingType) => void;
  onLabelChange?: (kfId: string, label: string) => void;
  labels: TimelineLabel[];
  onLabelAdd: (startTime: number, endTime: number) => void;
  onLabelMove: (labelId: string, newStartTime: number) => void;
  onLabelResize: (labelId: string, newStart: number, newEnd: number) => void;
  onLabelDelete: (labelId: string) => void;
  onLabelTextChange: (labelId: string, text: string) => void;
};

const MARKER_WIDTH = 12;

export function TimelineStrip({
  keyframes, duration, playhead,
  onSeek, onKeyframeDrag, onKeyframeSelect, onKeyframeDelete, onKeyframeCreate, onKeyframeDuplicate, onDurationChange,
  selectedKeyframeId, selectedKf, onEasingChange, onLabelChange,
  labels, onLabelAdd, onLabelMove, onLabelResize, onLabelDelete, onLabelTextChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);
  const [draggingKf, setDraggingKf] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

  const PAD_LEFT = 16;
  const totalWidth = duration * pixelsPerSecond + PAD_LEFT;

  const timeToX = useCallback((t: number) => t * pixelsPerSecond + PAD_LEFT, [pixelsPerSecond]);
  const xToTime = useCallback((x: number) => Math.max(0, (x - PAD_LEFT) / pixelsPerSecond), [pixelsPerSecond]);

  const getTimeFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0);
    return xToTime(x);
  }, [xToTime]);

  useEffect(() => {
    if (selectedKeyframeId && stripRef.current) {
      stripRef.current.focus();
    }
  }, [selectedKeyframeId]);

  const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".timeline-marker, .timeline-duration-handle, .timeline-label-lane")) return;
    e.preventDefault();
    onSeek(Math.min(getTimeFromEvent(e), duration));

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      onSeek(Math.min(getTimeFromEvent(ev), duration));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onSeek, getTimeFromEvent, duration]);

  const handleDurationDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const t = getTimeFromEvent(ev);
      const minDuration = keyframes.length > 0 ? Math.max(...keyframes.map(kf => kf.time)) + 1 : 1;
      onDurationChange(Math.max(minDuration, Math.round(t * 2) / 2));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [getTimeFromEvent, keyframes, onDurationChange]);

  const handleMarkerDragStart = useCallback((kfId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onKeyframeSelect(kfId);
    setSelectedLabelId(null);
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (sorted[0]?.id === kfId) return;
    setDraggingKf(kfId);

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const newTime = Math.max(0, Math.min(duration, Math.round(getTimeFromEvent(ev) * 10) / 10));
      onKeyframeDrag(kfId, newTime);
    };
    const onUp = () => {
      setDraggingKf(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onKeyframeDrag, onKeyframeSelect, getTimeFromEvent, duration, keyframes]);

  // --- Label lane interactions ---

  const clampLabel = useCallback((labelId: string, newStart: number, newEnd: number): { startTime: number; endTime: number } => {
    const others = labels.filter(l => l.id !== labelId).sort((a, b) => a.startTime - b.startTime);
    let start = Math.max(0, newStart);
    let end = Math.min(duration, newEnd);
    if (end - start < 0.2) end = start + 0.2;

    for (const other of others) {
      if (start < other.endTime && end > other.startTime) {
        if (start < other.startTime) {
          end = Math.min(end, other.startTime);
        } else {
          start = Math.max(start, other.endTime);
        }
      }
    }
    if (end - start < 0.2) end = start + 0.2;
    return { startTime: start, endTime: Math.min(end, duration) };
  }, [labels, duration]);

  const handleLabelLaneDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".timeline-label-bar")) return;
    e.stopPropagation();
    const time = getTimeFromEvent(e);
    const startTime = Math.max(0, Math.round(time * 10) / 10);
    const endTime = Math.min(duration, startTime + 1);
    const overlaps = labels.some(l => startTime < l.endTime && endTime > l.startTime);
    if (overlaps) return;
    onLabelAdd(startTime, endTime);
  }, [getTimeFromEvent, duration, labels, onLabelAdd]);

  const handleLabelDragStart = useCallback((labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedLabelId(labelId);
    const label = labels.find(l => l.id === labelId);
    if (!label) return;
    const dur = label.endTime - label.startTime;
    const startOffset = getTimeFromEvent(e) - label.startTime;

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const t = getTimeFromEvent(ev) - startOffset;
      const clamped = clampLabel(labelId, t, t + dur);
      onLabelMove(labelId, clamped.startTime);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [labels, getTimeFromEvent, clampLabel, onLabelMove]);

  const handleLabelResizeStart = useCallback((labelId: string, edge: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedLabelId(labelId);
    const label = labels.find(l => l.id === labelId);
    if (!label) return;

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      const t = Math.round(getTimeFromEvent(ev) * 10) / 10;
      if (edge === "left") {
        const clamped = clampLabel(labelId, t, label.endTime);
        onLabelResize(labelId, clamped.startTime, clamped.endTime);
      } else {
        const clamped = clampLabel(labelId, label.startTime, t);
        onLabelResize(labelId, clamped.startTime, clamped.endTime);
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [labels, getTimeFromEvent, clampLabel, onLabelResize]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      if (selectedLabelId) {
        onLabelDelete(selectedLabelId);
        setSelectedLabelId(null);
      } else if (selectedKeyframeId) {
        onKeyframeDelete(selectedKeyframeId);
      }
    }
  }, [selectedKeyframeId, onKeyframeDelete, selectedLabelId, onLabelDelete]);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPixelsPerSecond(parseInt(e.target.value));
  }, []);

  const timeMarkers: number[] = [];
  const step = pixelsPerSecond >= 80 ? 1 : pixelsPerSecond >= 40 ? 2 : 5;
  for (let t = 0; t <= duration; t += step) {
    timeMarkers.push(t);
  }

  return (
    <div className="timeline-strip-wrapper" ref={stripRef} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="timeline-strip-toolbar">
        <span className="timeline-strip-duration-label">{duration.toFixed(1)}s</span>
        <button
          className="btn btn-sm"
          onClick={e => { e.stopPropagation(); onKeyframeCreate(); }}
          title="Create a new keyframe at the playhead (copies the previous keyframe)"
        >+ Keyframe</button>
        <button
          className="btn btn-sm"
          onClick={e => { e.stopPropagation(); onKeyframeDuplicate(); }}
          disabled={!selectedKf}
          title="Duplicate the selected keyframe just after it"
        >⧉ Duplicate</button>
        {selectedKf && onLabelChange && (
          <>
            <span className="animate-kf-settings-label">KF{keyframes.indexOf(selectedKf) + 1}:</span>
            <input
              className="animate-kf-label-input"
              placeholder="Label..."
              value={selectedKf.label ?? ""}
              onChange={e => onLabelChange(selectedKf.id, e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </>
        )}
        {selectedKf && onEasingChange && (
          <select
            className="animate-speed-select"
            value={selectedKf.easing ?? "ease-in-out"}
            onChange={e => { onEasingChange(selectedKf.id, e.target.value as EasingType); }}
            onClick={e => e.stopPropagation()}
          >
            <option value="ease-in-out">Ease In-Out</option>
            <option value="ease-in">Ease In</option>
            <option value="ease-out">Ease Out</option>
            <option value="linear">Linear</option>
          </select>
        )}
        {selectedKf && keyframes.indexOf(selectedKf) > 0 && (
          <button className="btn btn-sm" onClick={() => onKeyframeDelete(selectedKf.id)} title="Delete keyframe">✕</button>
        )}
        <input
          type="range"
          className="timeline-zoom-slider"
          min={30}
          max={200}
          value={pixelsPerSecond}
          onChange={handleZoomChange}
          title="Zoom"
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div
        className="timeline-strip-container"
        ref={containerRef}
        onMouseDown={handleTrackMouseDown}
      >
        <div className="timeline-strip-track" style={{ width: totalWidth }}>
          {/* Time scale */}
          <div className="timeline-strip-scale">
            {timeMarkers.map(t => (
              <div key={t} className="timeline-strip-tick" style={{ left: timeToX(t) }}>
                <span className="timeline-strip-tick-label">{t}s</span>
              </div>
            ))}
          </div>

          {/* Keyframe markers */}
          {keyframes.map(kf => (
            <div
              key={kf.id}
              className={`timeline-marker ${kf.id === selectedKeyframeId ? "selected" : ""} ${kf.id === draggingKf ? "dragging" : ""}`}
              style={{ left: timeToX(kf.time) - MARKER_WIDTH / 2 }}
              onMouseDown={e => handleMarkerDragStart(kf.id, e)}
            >
              <div className="timeline-marker-diamond" />
              {kf.label && <span className="timeline-marker-label">{kf.label}</span>}
            </div>
          ))}

          {/* Playhead */}
          <div className="timeline-playhead" style={{ left: timeToX(playhead) }}>
            <div className="timeline-playhead-line" />
          </div>

          {/* Duration handle (right edge) */}
          <div
            className="timeline-duration-handle"
            style={{ left: totalWidth }}
            onMouseDown={handleDurationDragStart}
            title="Drag to change duration"
          />

          {/* Label lane */}
          <div className="timeline-label-lane" onDoubleClick={handleLabelLaneDoubleClick}>
            {labels.map(label => (
              <div
                key={label.id}
                className={`timeline-label-bar ${label.id === selectedLabelId ? "selected" : ""}`}
                style={{
                  left: timeToX(label.startTime),
                  width: Math.max(20, timeToX(label.endTime) - timeToX(label.startTime)),
                }}
                onMouseDown={e => handleLabelDragStart(label.id, e)}
                onDoubleClick={e => { e.stopPropagation(); setEditingLabelId(label.id); }}
              >
                <div className="timeline-label-bar-edge timeline-label-bar-edge-left" onMouseDown={e => handleLabelResizeStart(label.id, "left", e)} />
                {editingLabelId === label.id ? (
                  <input
                    className="timeline-label-bar-input"
                    autoFocus
                    defaultValue={label.text}
                    onBlur={e => { onLabelTextChange(label.id, e.target.value || "Label"); setEditingLabelId(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { onLabelTextChange(label.id, (e.target as HTMLInputElement).value || "Label"); setEditingLabelId(null); } }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="timeline-label-bar-text">{label.text}</span>
                )}
                <div className="timeline-label-bar-edge timeline-label-bar-edge-right" onMouseDown={e => handleLabelResizeStart(label.id, "right", e)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
