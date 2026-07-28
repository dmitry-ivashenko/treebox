import { useState, useRef, useEffect } from "react";
import type { DisplayMode } from "../../core/instance/types";
import { broadcastDisplayMode } from "../../core/instance/displayModeBroadcast";

type Props = {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
};

const OPTIONS: { mode: DisplayMode; label: string; icon: string }[] = [
  { mode: "code", label: "Code", icon: "code" },
  { mode: "explorer", label: "Explorer", icon: "explorer" },
  { mode: "split-v", label: "Split Vertical", icon: "split-v" },
  { mode: "split-h", label: "Split Horizontal", icon: "split-h" },
];

export function DisplayModeDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = OPTIONS.find((o) => o.mode === value)!;

  return (
    <div className="display-mode-dropdown" ref={ref}>
      <button
        className="display-mode-btn"
        onClick={() => setOpen(!open)}
        title={`Layout: ${current.label}`}
      >
        <DisplayModeIcon icon={current.icon} />
      </button>
      {open && (
        <div className="display-mode-menu">
          {OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              className={`display-mode-option ${opt.mode === value ? "active" : ""}`}
              title="Shift-click to apply to all panes"
              onClick={(e) => {
                // Shift-click sets every treebox pane on screen at once.
                if (e.shiftKey) broadcastDisplayMode(opt.mode);
                else onChange(opt.mode);
                setOpen(false);
              }}
            >
              <DisplayModeIcon icon={opt.icon} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DisplayModeIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "code":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="2" rx="0.5" fill="currentColor" opacity="0.8" />
          <rect x="2" y="7" width="9" height="2" rx="0.5" fill="currentColor" opacity="0.6" />
          <rect x="2" y="11" width="11" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
        </svg>
      );
    case "explorer":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 5.5H11M6 8H10M6 10.5H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case "split-v":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2" width="5.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <rect x="9" y="2" width="5.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "split-h":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1.5" width="12" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="9" width="12" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    default:
      return null;
  }
}
