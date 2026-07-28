import { useState } from "react";
import { useExplorerContext } from "./ExplorerContext";
import type { NodeId, TreeboxValue, NodeDisplayStatus } from "../../core/model/types";

type Props = {
  nodeId: NodeId;
  onClose: () => void;
};

export function NodePropertyEditor({ nodeId, onClose }: Props) {
  const { doc, updateNode } = useExplorerContext();
  const node = doc.nodes[nodeId];

  const [name, setName] = useState(node?.name ?? "");
  const [className, setClassName] = useState(node?.className ?? "");
  const [displayStatus, setDisplayStatus] = useState<NodeDisplayStatus | "">(node?.displayStatus ?? "");
  const [note, setNote] = useState(node?.note ?? "");
  const [props, setProps] = useState<[string, string][]>(
    Object.entries(node?.props ?? {}).map(([k, v]) => [k, String(v ?? "")])
  );

  if (!node) return null;

  const handleSave = () => {
    const newProps: Record<string, TreeboxValue> = {};
    for (const [key, val] of props) {
      if (!key.trim()) continue;
      newProps[key.trim()] = parseValue(val);
    }
    updateNode(nodeId, {
      name,
      className: className || undefined,
      props: newProps,
      displayStatus: displayStatus || undefined,
      note: note || undefined,
    });
    onClose();
  };

  const addProp = () => {
    setProps([...props, ["", ""]]);
  };

  const removeProp = (idx: number) => {
    setProps(props.filter((_, i) => i !== idx));
  };

  const updateProp = (idx: number, field: 0 | 1, value: string) => {
    const updated = [...props];
    updated[idx] = [...updated[idx]] as [string, string];
    updated[idx][field] = value;
    setProps(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Node</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="prop-field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="prop-input"
              autoFocus
            />
          </div>
          <div className="prop-field">
            <label>Class</label>
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="prop-input"
              placeholder="Optional"
            />
          </div>
          <div className="prop-field">
            <label>Status</label>
            <select
              className="prop-input"
              value={displayStatus}
              onChange={(e) => setDisplayStatus(e.target.value as NodeDisplayStatus | "")}
            >
              <option value="">Default</option>
              <option value="added">Added (+)</option>
              <option value="modified">Modified (●)</option>
              <option value="removed">Removed (−)</option>
            </select>
          </div>
          <div className="prop-field">
            <label>Properties</label>
            <div className="prop-table">
              {props.map(([key, val], idx) => (
                <div key={idx} className="prop-row">
                  <input
                    className="prop-key-input"
                    value={key}
                    onChange={(e) => updateProp(idx, 0, e.target.value)}
                    placeholder="Key"
                  />
                  <input
                    className="prop-value-input"
                    value={val}
                    onChange={(e) => updateProp(idx, 1, e.target.value)}
                    placeholder="Value"
                  />
                  <button
                    className="explorer-action-btn"
                    onClick={() => removeProp(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="btn" onClick={addProp}>
                + Add property
              </button>
            </div>
          </div>
          <div className="prop-field">
            <label>Note</label>
            <textarea
              className="prop-input prop-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Multiline note (renders as /* ... */)"
              rows={3}
            />
          </div>
          <div className="prop-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseValue(raw: string): TreeboxValue {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  const num = Number(raw);
  if (!isNaN(num) && raw.trim() !== "") return num;
  return raw;
}
