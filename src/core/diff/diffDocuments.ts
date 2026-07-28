import type { TreeboxDocument, NodeId } from "../model/types";
import type {
  TreeboxDiff,
  DiffNodePair,
  DiffChange,
  DiffSummary,
  DiffStatus,
} from "./diffTypes";
import { matchNodes } from "./matchNodes";

export function diffDocuments(
  left: TreeboxDocument,
  right: TreeboxDocument
): TreeboxDiff {
  const matches = matchNodes(left, right);
  const matchedLeft = new Set(matches.map((m) => m.leftId));
  const matchedRight = new Set(matches.map((m) => m.rightId));

  const nodePairs: DiffNodePair[] = [];
  const changes: DiffChange[] = [];
  let changeIdx = 0;

  for (const match of matches) {
    const leftNode = left.nodes[match.leftId];
    const rightNode = right.nodes[match.rightId];
    const nodeChanges: DiffChange[] = [];

    if (leftNode.name !== rightNode.name) {
      nodeChanges.push({
        id: `ch_${changeIdx++}`,
        type: "renamed",
        leftNodeId: match.leftId,
        rightNodeId: match.rightId,
        details: { from: leftNode.name, to: rightNode.name },
      });
    }

    if (leftNode.className !== rightNode.className) {
      nodeChanges.push({
        id: `ch_${changeIdx++}`,
        type: "classChanged",
        leftNodeId: match.leftId,
        rightNodeId: match.rightId,
        details: { from: leftNode.className, to: rightNode.className },
      });
    }

    if (JSON.stringify(leftNode.props) !== JSON.stringify(rightNode.props)) {
      nodeChanges.push({
        id: `ch_${changeIdx++}`,
        type: "propsChanged",
        leftNodeId: match.leftId,
        rightNodeId: match.rightId,
        details: { before: leftNode.props, after: rightNode.props },
      });
    }

    const leftParent = findParent(left, match.leftId);
    const rightParent = findParent(right, match.rightId);
    const leftParentMatch = leftParent
      ? matches.find((m) => m.leftId === leftParent)
      : null;
    const rightParentExpected = leftParentMatch?.rightId ?? null;

    if (rightParent !== rightParentExpected) {
      nodeChanges.push({
        id: `ch_${changeIdx++}`,
        type: "moved",
        leftNodeId: match.leftId,
        rightNodeId: match.rightId,
        pathBefore: getNodePath(left, match.leftId),
        pathAfter: getNodePath(right, match.rightId),
      });
    }

    let status: DiffStatus = "unchanged";
    if (nodeChanges.some((c) => c.type === "moved")) status = "moved";
    else if (nodeChanges.some((c) => c.type === "renamed")) status = "renamed";
    else if (nodeChanges.length > 0) status = "changed";

    nodePairs.push({
      pairId: `pair_${match.leftId}_${match.rightId}`,
      leftNodeId: match.leftId,
      rightNodeId: match.rightId,
      status,
    });

    changes.push(...nodeChanges);
  }

  for (const leftId of Object.keys(left.nodes)) {
    if (matchedLeft.has(leftId)) continue;
    nodePairs.push({
      pairId: `pair_removed_${leftId}`,
      leftNodeId: leftId,
      status: "removed",
    });
    changes.push({
      id: `ch_${changeIdx++}`,
      type: "removed",
      leftNodeId: leftId,
      pathBefore: getNodePath(left, leftId),
    });
  }

  for (const rightId of Object.keys(right.nodes)) {
    if (matchedRight.has(rightId)) continue;
    nodePairs.push({
      pairId: `pair_added_${rightId}`,
      rightNodeId: rightId,
      status: "added",
    });
    changes.push({
      id: `ch_${changeIdx++}`,
      type: "added",
      rightNodeId: rightId,
      pathAfter: getNodePath(right, rightId),
    });
  }

  const summary: DiffSummary = {
    added: changes.filter((c) => c.type === "added").length,
    removed: changes.filter((c) => c.type === "removed").length,
    changed: changes.filter((c) =>
      ["renamed", "classChanged", "propsChanged"].includes(c.type)
    ).length,
    moved: changes.filter((c) => c.type === "moved").length,
    reordered: changes.filter((c) => c.type === "reordered").length,
  };

  return {
    leftDocumentId: left.id,
    rightDocumentId: right.id,
    nodePairs,
    changes,
    summary,
  };
}

function findParent(doc: TreeboxDocument, nodeId: NodeId): NodeId | null {
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (node.children.includes(nodeId)) return id;
  }
  return null;
}

function getNodePath(doc: TreeboxDocument, nodeId: NodeId): string {
  const parts: string[] = [];
  let current: NodeId | null = nodeId;
  while (current) {
    const node = doc.nodes[current];
    if (!node) break;
    parts.unshift(node.name);
    current = findParent(doc, current);
  }
  return "/" + parts.join("/");
}
