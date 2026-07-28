import { useMemo } from "react";
import { getClassIcon } from "../explorer/classIcons";
import type { TreeboxDocument, NodeId } from "../../core/model/types";
import type { TreeboxDiff, DiffStatus } from "../../core/diff/diffTypes";

type Props = {
  leftDoc: TreeboxDocument;
  rightDoc: TreeboxDocument;
  diff: TreeboxDiff;
};

const ROW_HEIGHT = 24;
const GUTTER_WIDTH = 60;

function flattenTree(doc: TreeboxDocument): NodeId[] {
  const result: NodeId[] = [];
  const walk = (ids: NodeId[]) => {
    for (const id of ids) {
      const node = doc.nodes[id];
      if (!node) continue;
      result.push(id);
      walk(node.children);
    }
  };
  walk(doc.rootIds);
  return result;
}

export function DiffPreviewVisual({ leftDoc, rightDoc, diff }: Props) {
  const leftFlat = useMemo(() => flattenTree(leftDoc), [leftDoc]);
  const rightFlat = useMemo(() => flattenTree(rightDoc), [rightDoc]);

  const connectors = useMemo(() => {
    // O(1) lookup maps
    const leftIndexMap = new Map<NodeId, number>();
    leftFlat.forEach((id, i) => leftIndexMap.set(id, i));
    const rightIndexMap = new Map<NodeId, number>();
    rightFlat.forEach((id, i) => rightIndexMap.set(id, i));

    const pairByRightId = new Map<NodeId, (typeof diff.nodePairs)[number]>();
    const pairByLeftId = new Map<NodeId, (typeof diff.nodePairs)[number]>();
    for (const pair of diff.nodePairs) {
      if (pair.rightNodeId) pairByRightId.set(pair.rightNodeId, pair);
      if (pair.leftNodeId) pairByLeftId.set(pair.leftNodeId, pair);
    }

    // Precompute "preceding matched" arrays in O(n)
    const precedingLeftForRight: number[] = new Array(rightFlat.length);
    let lastMatchedLeft = -1;
    for (let i = 0; i < rightFlat.length; i++) {
      const pair = pairByRightId.get(rightFlat[i]);
      if (pair && pair.leftNodeId) {
        lastMatchedLeft = leftIndexMap.get(pair.leftNodeId) ?? -1;
      }
      precedingLeftForRight[i] = lastMatchedLeft;
    }

    const precedingRightForLeft: number[] = new Array(leftFlat.length);
    let lastMatchedRight = -1;
    for (let i = 0; i < leftFlat.length; i++) {
      const pair = pairByLeftId.get(leftFlat[i]);
      if (pair && pair.rightNodeId) {
        lastMatchedRight = rightIndexMap.get(pair.rightNodeId) ?? -1;
      }
      precedingRightForLeft[i] = lastMatchedRight;
    }

    // Insertion bands: walk rightFlat, group consecutive added nodes
    const insertionBands: { leftY: number; rightTop: number; rightBottom: number }[] = [];
    let i = 0;
    while (i < rightFlat.length) {
      const pair = pairByRightId.get(rightFlat[i]);
      if (!pair || pair.status !== "added") { i++; continue; }

      const anchorLeftIdx = i > 0 ? precedingLeftForRight[i - 1] : -1;
      const groupStart = i;
      let groupEnd = i;
      let j = i + 1;
      while (j < rightFlat.length) {
        const nextPair = pairByRightId.get(rightFlat[j]);
        if (!nextPair || nextPair.status !== "added") break;
        const nextAnchor = j > 0 ? precedingLeftForRight[j - 1] : -1;
        if (nextAnchor !== anchorLeftIdx) break;
        groupEnd = j;
        j++;
      }

      const leftY = (anchorLeftIdx + 1) * ROW_HEIGHT;
      const rightTop = groupStart * ROW_HEIGHT;
      const rightBottom = (groupEnd + 1) * ROW_HEIGHT;
      insertionBands.push({ leftY, rightTop, rightBottom });
      i = groupEnd + 1;
    }

    // Deletion bands: walk leftFlat, group consecutive removed nodes
    const deletionBands: { rightY: number; leftTop: number; leftBottom: number }[] = [];
    i = 0;
    while (i < leftFlat.length) {
      const pair = pairByLeftId.get(leftFlat[i]);
      if (!pair || pair.status !== "removed") { i++; continue; }

      const anchorRightIdx = i > 0 ? precedingRightForLeft[i - 1] : -1;
      const groupStart = i;
      let groupEnd = i;
      let j = i + 1;
      while (j < leftFlat.length) {
        const nextPair = pairByLeftId.get(leftFlat[j]);
        if (!nextPair || nextPair.status !== "removed") break;
        const nextAnchor = j > 0 ? precedingRightForLeft[j - 1] : -1;
        if (nextAnchor !== anchorRightIdx) break;
        groupEnd = j;
        j++;
      }

      const rightY = (anchorRightIdx + 1) * ROW_HEIGHT;
      const leftTop = groupStart * ROW_HEIGHT;
      const leftBottom = (groupEnd + 1) * ROW_HEIGHT;
      deletionBands.push({ rightY, leftTop, leftBottom });
      i = groupEnd + 1;
    }

    // Change bands
    const changeBands: { leftY: number; rightY: number }[] = [];
    for (const pair of diff.nodePairs) {
      if (!pair.leftNodeId || !pair.rightNodeId) continue;
      if (pair.status === "unchanged" || pair.status === "added" || pair.status === "removed") continue;
      const li = leftIndexMap.get(pair.leftNodeId);
      const ri = rightIndexMap.get(pair.rightNodeId);
      if (li === undefined || ri === undefined) continue;
      changeBands.push({ leftY: li * ROW_HEIGHT, rightY: ri * ROW_HEIGHT });
    }

    return { insertionBands, deletionBands, changeBands };
  }, [diff, leftFlat, rightFlat]);

  const svgHeight = Math.max(leftFlat.length, rightFlat.length) * ROW_HEIGHT;

  const getLeftStatus = (nodeId: NodeId): DiffStatus => {
    const pair = diff.nodePairs.find((p) => p.leftNodeId === nodeId);
    return pair?.status ?? "unchanged";
  };

  const getRightStatus = (nodeId: NodeId): DiffStatus => {
    const pair = diff.nodePairs.find((p) => p.rightNodeId === nodeId);
    return pair?.status ?? "unchanged";
  };

  const insertionPositions = useMemo(() => {
    return new Set(connectors.insertionBands.map(b => b.leftY / ROW_HEIGHT));
  }, [connectors.insertionBands]);

  const deletionPositions = useMemo(() => {
    return new Set(connectors.deletionBands.map(b => b.rightY / ROW_HEIGHT));
  }, [connectors.deletionBands]);

  return (
    <div className="diff-preview-visual">
      <div className="diff-preview-visual-header">
        <div className="diff-preview-visual-header-label">Before</div>
        <div className="diff-preview-visual-header-gutter" />
        <div className="diff-preview-visual-header-label">After</div>
      </div>
      <div className="diff-preview-visual-body">
        <div className="diff-preview-visual-tree">
          {leftDoc.rootIds.map((id) => (
            <DiffVisualRow key={id} nodeId={id} doc={leftDoc} depth={0} getStatus={getLeftStatus} insertAfterIndices={insertionPositions} flatList={leftFlat} />
          ))}
        </div>
        <div className="diff-preview-visual-gutter">
          <svg width={GUTTER_WIDTH} height={svgHeight}>
            {connectors.insertionBands.map((band, i) => {
              const thickness = 2;
              const cx1 = GUTTER_WIDTH * 0.35;
              const cx2 = GUTTER_WIDTH * 0.65;
              const d = [
                `M 0,${band.leftY - thickness}`,
                `C ${cx1},${band.leftY - thickness} ${cx2},${band.rightTop} ${GUTTER_WIDTH},${band.rightTop}`,
                `L ${GUTTER_WIDTH},${band.rightBottom}`,
                `C ${cx2},${band.rightBottom} ${cx1},${band.leftY + thickness} 0,${band.leftY + thickness}`,
                `Z`
              ].join(" ");
              return <path key={`ins${i}`} d={d} style={{ fill: "rgba(166, 227, 161, 0.18)", stroke: "none" }} />;
            })}
            {connectors.changeBands.map((band, i) => {
              const d = [
                `M 0,${band.leftY}`,
                `L ${GUTTER_WIDTH},${band.rightY}`,
                `L ${GUTTER_WIDTH},${band.rightY + ROW_HEIGHT}`,
                `L 0,${band.leftY + ROW_HEIGHT}`,
                `Z`
              ].join(" ");
              return <path key={`chg${i}`} d={d} style={{ fill: "rgba(250, 179, 135, 0.12)", stroke: "none" }} />;
            })}
            {connectors.deletionBands.map((band, i) => {
              const thickness = 2;
              const cx1 = GUTTER_WIDTH * 0.35;
              const cx2 = GUTTER_WIDTH * 0.65;
              const d = [
                `M ${GUTTER_WIDTH},${band.rightY - thickness}`,
                `C ${cx2},${band.rightY - thickness} ${cx1},${band.leftTop} 0,${band.leftTop}`,
                `L 0,${band.leftBottom}`,
                `C ${cx1},${band.leftBottom} ${cx2},${band.rightY + thickness} ${GUTTER_WIDTH},${band.rightY + thickness}`,
                `Z`
              ].join(" ");
              return <path key={`del${i}`} d={d} style={{ fill: "rgba(243, 139, 168, 0.15)", stroke: "none" }} />;
            })}
          </svg>
        </div>
        <div className="diff-preview-visual-tree">
          {rightDoc.rootIds.map((id) => (
            <DiffVisualRow key={id} nodeId={id} doc={rightDoc} depth={0} getStatus={getRightStatus} insertAfterIndices={deletionPositions} flatList={rightFlat} markerType="deletion" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffVisualRow({
  nodeId,
  doc,
  depth,
  getStatus,
  insertAfterIndices,
  flatList,
  markerType = "insertion",
}: {
  nodeId: NodeId;
  doc: TreeboxDocument;
  depth: number;
  getStatus: (id: NodeId) => DiffStatus;
  insertAfterIndices?: Set<number>;
  flatList?: NodeId[];
  markerType?: "insertion" | "deletion";
}) {
  const node = doc.nodes[nodeId];
  if (!node) return null;

  const status = getStatus(nodeId);
  const icon = getClassIcon(node.className);
  const marker = getMarker(status);
  const myIndex = flatList ? flatList.indexOf(nodeId) : -1;
  const showInsertionAfter = insertAfterIndices && myIndex >= 0 && insertAfterIndices.has(myIndex + 1);

  return (
    <>
      <div
        className={`diff-vis-row diff-vis-${status}`}
        style={{ paddingLeft: `${depth * 18 + 8}px`, height: ROW_HEIGHT }}
        data-node-id={nodeId}
      >
        <span className="diff-vis-marker">{marker}</span>
        <span className="diff-vis-icon" dangerouslySetInnerHTML={{ __html: icon.svg }} />
        <span className="diff-vis-name">{node.name}</span>
        {node.className && <span className="diff-vis-class">[{node.className}]</span>}
        {Object.keys(node.props).length > 0 && (
          <span className="diff-vis-props">
            {Object.entries(node.props).map(([k, v]) => (
              <span key={k} className="diff-vis-prop">
                <span className="diff-vis-prop-key">{k}</span>
                <span className="diff-vis-prop-eq">=</span>
                <span className="diff-vis-prop-val">{String(v)}</span>
              </span>
            ))}
          </span>
        )}
        {node.comment && <span className="diff-vis-comment">{node.comment}</span>}
      </div>
      {node.note && node.note.split("\n").map((line, ni) => (
        <div
          key={`note-${ni}`}
          className="diff-vis-row explorer-note-row"
          style={{ paddingLeft: `${(depth + 1) * 18 + 8}px`, height: ROW_HEIGHT }}
        >
          <span className="explorer-note-text">{line}</span>
        </div>
      ))}
      {showInsertionAfter && (
        <div className="diff-vis-insertion-line" style={{ height: 0 }}>
          <div className={markerType === "deletion" ? "diff-vis-deletion-hr" : "diff-vis-insertion-hr"} />
        </div>
      )}
      {node.children.map((childId) => (
        <DiffVisualRow key={childId} nodeId={childId} doc={doc} depth={depth + 1} getStatus={getStatus} insertAfterIndices={insertAfterIndices} flatList={flatList} markerType={markerType} />
      ))}
    </>
  );
}

function getMarker(status: DiffStatus): string {
  switch (status) {
    case "added": return "+";
    case "removed": return "−";
    case "changed": return "~";
    case "moved": return "↪";
    case "renamed": return "✎";
    default: return "";
  }
}
