import type { InterpolatedNode } from "../../core/animate/interpolate";
import { getAnimationHeight } from "../../core/animate/interpolate";

const ROW_HEIGHT = 24;

type Props = {
  nodes: InterpolatedNode[];
  activeLabel?: { text: string; opacity: number };
  centered?: boolean;
  fixedHeight?: number;
  /** Fixed x for the right-side badge column (status markers + package icon). */
  badgeColumnX?: number;
};

export function AnimatedPreview({ nodes, activeLabel, centered, fixedHeight, badgeColumnX }: Props) {
  const height = fixedHeight ?? getAnimationHeight(nodes);
  const contentWidth = nodes.reduce((max, n) => {
    const nameLen = (n.name?.length ?? 0) + (n.className?.length ?? 0) * 1 + 10;
    return Math.max(max, n.x + nameLen * 8);
  }, 200);
  // Make sure the badge column (and the badges sitting in it) fit when centered.
  const width = Math.max(contentWidth, (badgeColumnX ?? 0) + 48);

  return (
    <div className={`animate-preview-container ${centered ? "animate-preview-centered" : ""}`}>
      <div className="animate-label-slot">
        {activeLabel && (
          <span className="animate-label-badge" style={{ opacity: activeLabel.opacity }}>
            {activeLabel.text}
          </span>
        )}
      </div>
      <div className="animate-canvas" style={{ position: "relative", height, width: centered ? width : undefined, minHeight: 100 }}>
        {nodes.map(node => (
          <AnimatedNode key={node.id} node={node} badgeColumnX={badgeColumnX} />
        ))}
      </div>
    </div>
  );
}

const STATUS_GLYPH: Record<string, string> = { added: "+", modified: "●", removed: "−" };

function AnimatedNode({ node, badgeColumnX }: { node: InterpolatedNode; badgeColumnX?: number }) {
  const noteLines = node.note ? node.note.split("\n") : [];
  const hasBadges = !!node.displayStatus || !!node.hasPackage;

  return (
    <>
      <div
        className={`animate-node animate-node-${node.status}`}
        style={{
          position: "absolute",
          transform: `translate(${node.x}px, ${node.y}px)`,
          opacity: node.opacity,
          willChange: "transform, opacity",
        }}
      >
        <span className="animate-node-icon" dangerouslySetInnerHTML={{ __html: node.icon.svg }} />
        <span className="animate-node-name">{node.name}</span>
        {node.className && <span className="animate-node-class">[{node.className}]</span>}
        {node.props && Object.keys(node.props).length > 0 && (
          <span className="animate-node-props">
            {Object.entries(node.props).map(([k, v]) => (
              <span key={k} className="animate-node-prop">
                <span className="animate-node-prop-key">{k}</span>
                <span className="animate-node-prop-eq">=</span>
                <span className="animate-node-prop-val">{String(v)}</span>
              </span>
            ))}
          </span>
        )}
        {node.tags && node.tags.length > 0 && (
          <span className="animate-node-tags">
            {node.tags.map(t => <span key={t} className="animate-node-tag">#{t}</span>)}
          </span>
        )}
        {node.comment && (
          <span
            className="animate-node-comment"
            style={node.commentOpacity !== undefined ? { opacity: node.commentOpacity } : undefined}
          >
            // {node.comment}
          </span>
        )}
      </div>

      {/* Right-side badges, aligned to a fixed column so they don't scatter. */}
      {hasBadges && (
        <div
          className="animate-node-badges"
          style={{
            position: "absolute",
            transform: `translate(${badgeColumnX ?? node.x}px, ${node.y}px)`,
            opacity: node.opacity,
          }}
        >
          {node.displayStatus && (
            <span
              className={`animate-node-status status-${node.displayStatus}`}
              style={node.statusOpacity !== undefined ? { opacity: node.statusOpacity } : undefined}
            >
              {STATUS_GLYPH[node.displayStatus]}
            </span>
          )}
          {node.hasPackage && (
            <span
              className="animate-node-package"
              title="Package"
              style={node.packageOpacity !== undefined ? { opacity: node.packageOpacity } : undefined}
            >
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <rect x="1.5" y="5" width="7" height="6" rx="3" stroke="#bbb" strokeWidth="1.4" fill="none" />
                <rect x="7.5" y="5" width="7" height="6" rx="3" stroke="#bbb" strokeWidth="1.4" fill="none" />
              </svg>
            </span>
          )}
        </div>
      )}

      {noteLines.length > 0 && noteLines.map((line, i) => (
        <div
          key={`${node.id}-note-${i}`}
          className="animate-note-line"
          style={{
            position: "absolute",
            transform: `translate(${node.x + 18}px, ${node.y + (i + 1) * ROW_HEIGHT}px)`,
            opacity: node.noteOpacity ?? node.opacity,
          }}
        >
          {line}
        </div>
      ))}
    </>
  );
}
