import { useState } from "react";

type Props = {
  type: "url" | "storage";
  message: string;
  onDismiss: () => void;
  onReset: () => void;
};

export function ErrorRecovery({ type, message, onDismiss, onReset }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{type === "url" ? "Invalid Share URL" : "Storage Error"}</h2>
          <button className="modal-close" onClick={onDismiss}>×</button>
        </div>
        <div className="modal-body">
          <div className="recovery-message">
            {type === "url" ? (
              <p>Could not open shared Treebox document. The URL payload is invalid or truncated.</p>
            ) : (
              <p>Could not load saved document. The data may be corrupted.</p>
            )}
          </div>

          {message && (
            <div className="recovery-details">
              <button
                className="btn-small"
                onClick={() => setShowRaw(!showRaw)}
              >
                {showRaw ? "Hide" : "Show"} details
              </button>
              {showRaw && (
                <pre className="recovery-raw">{message}</pre>
              )}
            </div>
          )}

          <div className="recovery-actions">
            <button className="btn btn-primary" onClick={onDismiss}>
              Start empty document
            </button>
            <button className="btn" onClick={onReset}>
              Reset all data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
