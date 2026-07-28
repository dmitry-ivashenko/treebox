import { useMemo } from "react";
import { useTreeboxStore, selectActiveTab } from "./store";
import {
  getPayloadSize,
  URL_WARNING_BYTES,
  URL_DANGER_BYTES,
} from "../core/share/encodeSharePayload";

export function StatusBar() {
  const activeTab = useTreeboxStore(selectActiveTab);

  if (!activeTab) return null;

  const doc = activeTab.edit.document;
  const nodeCount = Object.keys(doc.nodes).length;

  const urlSize = useMemo(
    () => (nodeCount > 0 ? getPayloadSize(doc) : 0),
    [doc, nodeCount]
  );

  const urlSizeClass =
    urlSize > URL_DANGER_BYTES
      ? "status-error"
      : urlSize > URL_WARNING_BYTES
        ? "status-warning"
        : "";

  return (
    <footer className="status-bar">
      <span className="status-item">
        Nodes: {nodeCount}
      </span>
      {nodeCount > 0 && (
        <span className={`status-item ${urlSizeClass}`}>
          URL: {urlSize}B
          {urlSize > URL_WARNING_BYTES && " (large)"}
          {urlSize > URL_DANGER_BYTES && " — use Export instead"}
        </span>
      )}
    </footer>
  );
}
