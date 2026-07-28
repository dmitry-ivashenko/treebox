import type { TreeboxDocument, NodeId } from "../model/types";

export type NodeMatch = {
  leftId: NodeId;
  rightId: NodeId;
};

export function matchNodes(
  left: TreeboxDocument,
  right: TreeboxDocument
): NodeMatch[] {
  const matches: NodeMatch[] = [];
  const matchedLeft = new Set<NodeId>();
  const matchedRight = new Set<NodeId>();

  // Pass 1: Match by explicit ID
  for (const leftId of Object.keys(left.nodes)) {
    if (right.nodes[leftId]) {
      matches.push({ leftId, rightId: leftId });
      matchedLeft.add(leftId);
      matchedRight.add(leftId);
    }
  }

  // Pass 2: Match by HistoryId prop
  const rightByHistoryId = new Map<string, NodeId>();
  for (const [id, node] of Object.entries(right.nodes)) {
    if (matchedRight.has(id)) continue;
    const hid = node.props["HistoryId"];
    if (typeof hid === "string") {
      rightByHistoryId.set(hid, id);
    }
  }

  for (const [id, node] of Object.entries(left.nodes)) {
    if (matchedLeft.has(id)) continue;
    const hid = node.props["HistoryId"];
    if (typeof hid === "string" && rightByHistoryId.has(hid)) {
      const rightId = rightByHistoryId.get(hid)!;
      if (!matchedRight.has(rightId)) {
        matches.push({ leftId: id, rightId });
        matchedLeft.add(id);
        matchedRight.add(rightId);
      }
    }
  }

  // Pass 3: Match by same parent + same name + same class
  for (const leftId of Object.keys(left.nodes)) {
    if (matchedLeft.has(leftId)) continue;
    const leftNode = left.nodes[leftId];
    const leftParentId = findParent(left, leftId);

    for (const rightId of Object.keys(right.nodes)) {
      if (matchedRight.has(rightId)) continue;
      const rightNode = right.nodes[rightId];

      if (leftNode.name !== rightNode.name) continue;
      if (leftNode.className !== rightNode.className) continue;

      const rightParentId = findParent(right, rightId);
      const leftParentMatched = leftParentId
        ? matches.find((m) => m.leftId === leftParentId)
        : null;

      if (!leftParentId && !rightParentId) {
        matches.push({ leftId, rightId });
        matchedLeft.add(leftId);
        matchedRight.add(rightId);
        break;
      }

      if (leftParentMatched && leftParentMatched.rightId === rightParentId) {
        matches.push({ leftId, rightId });
        matchedLeft.add(leftId);
        matchedRight.add(rightId);
        break;
      }
    }
  }

  return matches;
}

function findParent(doc: TreeboxDocument, nodeId: NodeId): NodeId | null {
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (node.children.includes(nodeId)) return id;
  }
  return null;
}
