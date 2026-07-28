import { useState } from "react";
import { useTreeboxStore } from "../../app/store";
import {
  encodeSharePayload,
  encodeMultiSharePayload,
  encodeAnimateSharePayload,
  URL_WARNING_BYTES,
  URL_DANGER_BYTES,
} from "../../core/share/encodeSharePayload";
import { serializeTreeText } from "../../core/serializer/serializeTreeText";
import { DEFAULT_FORMAT_SETTINGS } from "../../core/model/types";

type Props = {
  onClose: () => void;
};

// Visual row height used by the tree/animation renderers (see interpolate.ts).
const ROW_HEIGHT = 24;
// Chrome above the content area plus surrounding padding. Kept lean since the
// embed target (iframe) has minimal chrome — avoids a big empty gap below the tree.
const APP_CHROME = 16;
// Extra space reserved per mode below/around the content.
const MODE_OVERHEAD: Record<string, number> = {
  edit: 8,
  diff: 8,
  timeline: 24,    // step headers
  animate: 120,    // label slot + player controls + timeline strip
};

function countTreeRows(doc: import("../../core/model/types").TreeboxDocument): number {
  let rows = 0;
  const walk = (ids: string[]) => {
    for (const id of ids) {
      const node = doc.nodes[id];
      if (!node) continue;
      rows += 1;
      if (node.note) rows += node.note.split("\n").length;
      walk(node.children);
    }
  };
  walk(doc.rootIds);
  return rows;
}

/** Estimate a recommended iframe/container height (px) for embedding a share link. */
function estimateEmbedHeight(
  mode: string,
  docs: import("../../core/model/types").TreeboxDocument[],
): number {
  const maxRows = docs.reduce((max, d) => Math.max(max, countTreeRows(d)), 1);
  const content = maxRows * ROW_HEIGHT;
  const overhead = MODE_OVERHEAD[mode] ?? MODE_OVERHEAD.edit;
  const total = APP_CHROME + content + overhead;
  return Math.ceil(total / 10) * 10; // round up to a tidy 10px
}

export function ShareDialog({ onClose }: Props) {
  const activeTab = useTreeboxStore(s => s.tabs.find(t => t.id === s.activeTabId));
  const [copied, setCopied] = useState<string | null>(null);

  if (!activeTab) return null;

  const mode = activeTab.activeMode;
  const editDoc = activeTab.edit.document;

  const getDocs = (): import("../../core/model/types").TreeboxDocument[] => {
    if (mode === "diff" && activeTab.diff) return [activeTab.diff.left.document, activeTab.diff.right.document];
    if (mode === "timeline" && activeTab.timeline) return activeTab.timeline.steps.map(s => s.document);
    if (mode === "animate" && activeTab.animate) return activeTab.animate.keyframes.map(kf => kf.document);
    return [editDoc];
  };
  const docs = getDocs();
  const stepLabels = mode === "timeline" && activeTab.timeline
    ? activeTab.timeline.steps.map(s => s.label)
    : undefined;
  const useMulti = (mode === "diff" || mode === "timeline" || mode === "animate") && docs.length >= 2;

  const payload = mode === "animate" && activeTab.animate
    ? encodeAnimateSharePayload(activeTab.animate)
    : useMulti
      ? encodeMultiSharePayload(mode, docs, stepLabels)
      : encodeSharePayload(editDoc);
  const size = payload.length;
  const shareUrl = `${window.location.origin}${window.location.pathname}#d=${payload}`;

  const recommendedHeight = estimateEmbedHeight(mode, docs);
  const iframeSnippet = `<iframe src="${shareUrl}" width="100%" height="${recommendedHeight}" style="border:0" loading="lazy"></iframe>`;
  const fmtWithIds = { ...DEFAULT_FORMAT_SETTINGS, includeAllIds: true };
  const textTree = mode === "animate" && activeTab.animate
    ? (() => {
        const anim = activeTab.animate;
        const header = `=== ANIMATION [duration=${anim.duration}, loop=${anim.loop}, speed=${anim.speed}] ===`;
        const kfTexts = anim.keyframes.map((kf, i) => {
          const attrs: string[] = [`time=${kf.time}`];
          if (kf.easing) attrs.push(`easing=${kf.easing}`);
          if (kf.label) attrs.push(`label="${kf.label}"`);
          return `--- Keyframe ${i + 1} [${attrs.join(", ")}] ---\n${serializeTreeText(kf.document, fmtWithIds)}`;
        });
        let text = `${header}\n\n${kfTexts.join("\n\n")}`;
        if (anim.labels.length > 0) {
          text += "\n\n--- Labels ---\n" + anim.labels.map(l => `[${l.startTime.toFixed(1)}s - ${l.endTime.toFixed(1)}s] "${l.text}"`).join("\n");
        }
        return text;
      })()
    : useMulti
      ? docs.map((d, i) => {
          const label = mode === "timeline" ? stepLabels?.[i] : undefined;
          return `--- Step ${i + 1}${label ? ` [label="${label}"]` : ""} ---\n${serializeTreeText(d)}`;
        }).join("\n\n")
      : serializeTreeText(editDoc);
  const slackText = "```\n" + textTree + "\n```";
  const markdownLink = `[link](${shareUrl})`;
  const obsidianBlock = [
    "> [!info]- Code",
    `> ${markdownLink}`,
    "> ```",
    ...textTree.split("\n").map(l => `> ${l}`),
    "> ```",
  ].join("\n");

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const sizeClass =
    size > URL_DANGER_BYTES
      ? "share-size-danger"
      : size > URL_WARNING_BYTES
        ? "share-size-warning"
        : "share-size-ok";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="share-warning">
            This link contains the full document. Anyone with the link can read it.
          </p>

          <div className="share-section">
            <label>Share URL</label>
            <div className="share-url-row">
              <input
                className="share-url-input"
                value={shareUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className="btn btn-primary"
                onClick={() => copyToClipboard(shareUrl, "url")}
              >
                {copied === "url" ? "Copied!" : "Copy URL"}
              </button>
            </div>
            <span className={`share-size ${sizeClass}`}>
              Payload: {size} bytes
              {size > URL_WARNING_BYTES &&
                " — This document may be too large for reliable URL sharing."}
            </span>
            <div className="share-embed-hint">
              <span>
                Recommended embed height: <strong>{recommendedHeight}px</strong>
                <span className="share-embed-note"> (for iframe in Confluence etc.)</span>
              </span>
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(String(recommendedHeight), "height")}
                title="Copy height value"
              >
                {copied === "height" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="share-embed-iframe">
              <input
                className="share-url-input share-iframe-input"
                value={iframeSnippet}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(iframeSnippet, "iframe")}
                title="Copy ready-to-paste iframe tag"
              >
                {copied === "iframe" ? "Copied!" : "Copy iframe"}
              </button>
            </div>
          </div>

          <div className="share-section">
            <label>Copy as</label>
            <div className="share-buttons">
              <button
                className="btn"
                onClick={() => copyToClipboard(textTree, "text")}
              >
                {copied === "text" ? "Copied!" : "Text tree"}
              </button>
              <button
                className="btn"
                onClick={() => copyToClipboard(slackText, "slack")}
              >
                {copied === "slack" ? "Copied!" : "For Slack"}
              </button>
              <button
                className="btn"
                onClick={() => copyToClipboard(markdownLink, "markdown")}
                title="Copy as Markdown link"
              >
                {copied === "markdown" ? "Copied!" : "Markdown link"}
              </button>
              <button
                className="btn"
                onClick={() => copyToClipboard(obsidianBlock, "obsidian")}
                title="Copy as a collapsible Obsidian callout with link + code"
              >
                {copied === "obsidian" ? "Copied!" : "Obsidian"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  const jsonData = mode === "animate" && activeTab.animate
                    ? {
                        mode: "animate",
                        duration: activeTab.animate.duration,
                        loop: activeTab.animate.loop,
                        speed: activeTab.animate.speed,
                        keyframes: activeTab.animate.keyframes.map(kf => ({
                          time: kf.time, easing: kf.easing, label: kf.label, document: kf.document,
                        })),
                        labels: activeTab.animate.labels,
                      }
                    : useMulti ? docs : editDoc;
                  copyToClipboard(JSON.stringify(jsonData, null, 2), "json");
                }}
              >
                {copied === "json" ? "Copied!" : "JSON"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
