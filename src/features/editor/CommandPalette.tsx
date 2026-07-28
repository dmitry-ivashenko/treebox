import { useState, useEffect, useRef, useMemo } from "react";
import { useTreeboxStore } from "../../app/store";
import { useImportExport } from "../share/ImportExport";
import { serializeTreeText } from "../../core/serializer/serializeTreeText";
import { TEMPLATES } from "../../core/model/templates";

type Command = {
  id: string;
  label: string;
  action: () => void;
};

type Props = {
  onClose: () => void;
  instance?: import("../../core/instance/types").TreeboxInstance | null;
};

export function CommandPalette({ onClose, instance }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setMode } = useTreeboxStore();
  const { exportAsText, exportAsJson, importFile } = useImportExport();

  const commands: Command[] = useMemo(() => {
    if (!instance) return [];
    const doc = instance.doc;
    const setText = instance.setText;
    const applyExplorerAdd = instance.applyExplorerAdd;
    const collapseAll = instance.collapseAll;
    const expandAll = instance.expandAll;

    return [
      {
        id: "format",
        label: "Format text",
        action: () => setText(serializeTreeText(doc)),
      },
      {
        id: "add-root",
        label: "Add root node",
        action: () => applyExplorerAdd(null, "NewNode", "Model"),
      },
      {
        id: "add-child",
        label: "Add child node",
        action: () => {
          const selected = doc.viewState.selectedNodeId;
          applyExplorerAdd(selected ?? null, "NewNode");
        },
      },
      {
        id: "diff",
        label: "Open diff",
        action: () => setMode("diff"),
      },
      {
        id: "timeline",
        label: "Open timeline",
        action: () => setMode("timeline"),
      },
      {
        id: "export-text",
        label: "Export text",
        action: exportAsText,
      },
      {
        id: "export-json",
        label: "Export JSON",
        action: exportAsJson,
      },
      {
        id: "import",
        label: "Import file",
        action: importFile,
      },
      {
        id: "copy-slack",
        label: "Copy for Slack",
        action: () => {
          const text = serializeTreeText(doc);
          navigator.clipboard.writeText("```\n" + text + "\n```");
        },
      },
      {
        id: "copy-text",
        label: "Copy text tree",
        action: () => navigator.clipboard.writeText(serializeTreeText(doc)),
      },
      {
        id: "collapse-all",
        label: "Collapse all",
        action: collapseAll,
      },
      {
        id: "expand-all",
        label: "Expand all",
        action: expandAll,
      },
      ...TEMPLATES.map((t) => ({
        id: `template-${t.id}`,
        label: `Load example: ${t.title}`,
        action: () => setText(t.text),
      })),
    ];
  }, [instance, setMode, exportAsText, exportAsJson, importFile]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIdx]) {
          filtered[selectedIdx].action();
          onClose();
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
        />
        <div className="command-list">
          {filtered.map((cmd, idx) => (
            <div
              key={cmd.id}
              className={`command-item ${idx === selectedIdx ? "selected" : ""}`}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              {cmd.label}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="command-empty">No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
}
