import { useMemo, useState } from "react";
import type { TreeboxDocument, TreeboxNode, NodeId } from "../../core/model/types";
import type { TreeboxDiff, DiffStatus } from "../../core/diff/diffTypes";

type Props = {
  leftDoc: TreeboxDocument;
  rightDoc: TreeboxDocument;
  diff: TreeboxDiff;
};

type AlignedRow = {
  leftText: string;
  rightText: string;
  status: DiffStatus;
};

export function DiffPreviewText({ leftDoc, rightDoc, diff }: Props) {
  const [copied, setCopied] = useState(false);

  const rows = useMemo(
    () => buildAlignedRows(leftDoc, rightDoc, diff),
    [leftDoc, rightDoc, diff]
  );

  const leftWidth = Math.max(...rows.map((r) => r.leftText.length), 20);

  const plainText = useMemo(() => {
    return rows
      .map((r) => {
        const left = r.leftText.padEnd(leftWidth);
        const gutter = getGutterPlain(r.status);
        return `${left} ${gutter} ${r.rightText}`;
      })
      .join("\n");
  }, [rows, leftWidth]);

  const handleCopy = () => {
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="diff-preview-text">
      <div className="diff-preview-text-header">
        <button className="btn btn-sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="diff-preview-text-content">
        {rows.map((row, i) => (
          <DiffRow key={i} row={row} leftWidth={leftWidth} />
        ))}
      </pre>
    </div>
  );
}

function DiffRow({ row, leftWidth }: { row: AlignedRow; leftWidth: number }) {
  const left = row.leftText.padEnd(leftWidth);
  const gutter = getGutterSymbol(row.status);
  const cls = getRowClass(row.status);

  return (
    <span className={`diff-text-row ${cls}`}>
      <span className="diff-text-left">{left}</span>
      <span className="diff-text-gutter">{gutter}</span>
      <span className="diff-text-right">{row.rightText}</span>
      {"\n"}
    </span>
  );
}

function getGutterSymbol(status: DiffStatus): string {
  switch (status) {
    case "unchanged": return " │ ";
    case "changed":   return "~│~";
    case "renamed":   return "~│~";
    case "moved":     return "~│~";
    case "removed":   return "-│ ";
    case "added":     return " │+";
  }
}

function getGutterPlain(status: DiffStatus): string {
  switch (status) {
    case "unchanged": return " | ";
    case "changed":   return "~|~";
    case "renamed":   return "~|~";
    case "moved":     return "~|~";
    case "removed":   return "-| ";
    case "added":     return " |+";
  }
}

function getRowClass(status: DiffStatus): string {
  switch (status) {
    case "unchanged": return "";
    case "changed":   return "diff-text-changed";
    case "renamed":   return "diff-text-changed";
    case "moved":     return "diff-text-moved";
    case "removed":   return "diff-text-removed";
    case "added":     return "diff-text-added";
  }
}

function buildAlignedRows(
  leftDoc: TreeboxDocument,
  rightDoc: TreeboxDocument,
  diff: TreeboxDiff
): AlignedRow[] {
  const leftToRight = new Map<NodeId, NodeId>();
  const rightToLeft = new Map<NodeId, NodeId>();
  const pairStatus = new Map<string, DiffStatus>();

  for (const pair of diff.nodePairs) {
    if (pair.leftNodeId && pair.rightNodeId) {
      leftToRight.set(pair.leftNodeId, pair.rightNodeId);
      rightToLeft.set(pair.rightNodeId, pair.leftNodeId);
      pairStatus.set(`${pair.leftNodeId}:${pair.rightNodeId}`, pair.status);
    }
  }

  const removedIds = new Set(
    diff.nodePairs.filter((p) => p.status === "removed").map((p) => p.leftNodeId!)
  );

  const rows: AlignedRow[] = [];

  function alignChildren(
    leftIds: NodeId[],
    rightIds: NodeId[],
    leftPrefix: string,
    rightPrefix: string,
    isRoot = false
  ) {
    const rightUsed = new Set<NodeId>();
    const merged: { leftId?: NodeId; rightId?: NodeId; status: DiffStatus }[] = [];

    let rightIdx = 0;
    for (const leftId of leftIds) {
      const matchedRight = leftToRight.get(leftId);

      if (matchedRight && rightIds.includes(matchedRight) && !rightUsed.has(matchedRight)) {
        const matchPos = rightIds.indexOf(matchedRight);
        for (let r = rightIdx; r < matchPos; r++) {
          if (!rightUsed.has(rightIds[r])) {
            rightUsed.add(rightIds[r]);
            if (!rightToLeft.has(rightIds[r]) || removedIds.has(rightToLeft.get(rightIds[r])!)) {
              merged.push({ rightId: rightIds[r], status: "added" });
            }
          }
        }
        rightUsed.add(matchedRight);
        rightIdx = matchPos + 1;
        const status = pairStatus.get(`${leftId}:${matchedRight}`) ?? "unchanged";
        merged.push({ leftId, rightId: matchedRight, status });
      } else {
        merged.push({ leftId, status: "removed" });
      }
    }

    for (let r = rightIdx; r < rightIds.length; r++) {
      if (!rightUsed.has(rightIds[r])) {
        merged.push({ rightId: rightIds[r], status: "added" });
      }
    }

    for (let i = 0; i < merged.length; i++) {
      const item = merged[i];
      const isLastLeft = !merged.slice(i + 1).some((m) => m.leftId);
      const isLastRight = !merged.slice(i + 1).some((m) => m.rightId);

      const leftNode = item.leftId ? leftDoc.nodes[item.leftId] : null;
      const rightNode = item.rightId ? rightDoc.nodes[item.rightId] : null;

      const leftConnector = isRoot ? ""
        : item.leftId ? (isLastLeft ? "└── " : "├── ") : "";
      const rightConnector = isRoot ? ""
        : item.rightId ? (isLastRight ? "└── " : "├── ") : "";

      const leftLine = leftNode
        ? leftPrefix + leftConnector + formatNode(leftNode)
        : "";
      const rightLine = rightNode
        ? rightPrefix + rightConnector + formatNode(rightNode)
        : "";

      rows.push({ leftText: leftLine, rightText: rightLine, status: item.status });

      const nextLeftPrefix = isRoot ? leftPrefix
        : leftPrefix + (item.leftId ? (isLastLeft ? "    " : "│   ") : "");
      const nextRightPrefix = isRoot ? rightPrefix
        : rightPrefix + (item.rightId ? (isLastRight ? "    " : "│   ") : "");

      if (leftNode && rightNode) {
        alignChildren(
          leftNode.children,
          rightNode.children,
          nextLeftPrefix,
          nextRightPrefix
        );
      } else if (leftNode) {
        renderSubtree(leftDoc, leftNode.children, nextLeftPrefix, "left");
      } else if (rightNode) {
        renderSubtree(rightDoc, rightNode.children, nextRightPrefix, "right");
      }
    }
  }

  function renderSubtree(
    doc: TreeboxDocument,
    childIds: NodeId[],
    prefix: string,
    side: "left" | "right"
  ) {
    for (let i = 0; i < childIds.length; i++) {
      const node = doc.nodes[childIds[i]];
      if (!node) continue;
      const isLast = i === childIds.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const line = prefix + connector + formatNode(node);
      const status: DiffStatus = side === "left" ? "removed" : "added";

      rows.push({
        leftText: side === "left" ? line : "",
        rightText: side === "right" ? line : "",
        status,
      });

      const childPrefix = prefix + (isLast ? "    " : "│   ");
      renderSubtree(doc, node.children, childPrefix, side);
    }
  }

  alignChildren(leftDoc.rootIds, rightDoc.rootIds, "", "", true);

  return rows;
}

function formatNode(node: TreeboxNode): string {
  let result = node.name;
  if (node.className) result += ` [${node.className}]`;
  const propEntries = Object.entries(node.props);
  if (propEntries.length > 0) {
    result += `  (${propEntries.map(([k, v]) => `${k}=${String(v)}`).join(", ")})`;
  }
  if (node.comment) result += `  // ${node.comment}`;
  return result;
}
