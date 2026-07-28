import { useMemo, useState } from "react";
import type { TreeboxDocument, TreeboxNode, NodeId } from "../../core/model/types";
import type { TreeboxDiff, DiffStatus } from "../../core/diff/diffTypes";
import { diffDocuments } from "../../core/diff/diffDocuments";

type Props = {
  docs: TreeboxDocument[];
};

type MultiRow = {
  cells: string[];
  gutters: DiffStatus[];
};

export function TimelinePreviewText({ docs }: Props) {
  const [copied, setCopied] = useState(false);

  const diffs = useMemo(
    () => docs.slice(0, -1).map((d, i) => diffDocuments(d, docs[i + 1])),
    [docs]
  );

  const rows = useMemo(
    () => buildMultiAlignedRows(docs, diffs),
    [docs, diffs]
  );

  const colWidths = useMemo(() => {
    const widths = docs.map(() => 20);
    for (const row of rows) {
      for (let c = 0; c < row.cells.length; c++) {
        widths[c] = Math.max(widths[c], row.cells[c].length);
      }
    }
    return widths;
  }, [rows, docs.length]);

  const plainText = useMemo(() => {
    return rows
      .map((row) => {
        const parts: string[] = [];
        for (let c = 0; c < row.cells.length; c++) {
          parts.push(row.cells[c].padEnd(colWidths[c]));
          if (c < row.gutters.length) {
            parts.push(" " + getGutterPlain(row.gutters[c]) + " ");
          }
        }
        return parts.join("");
      })
      .join("\n");
  }, [rows, colWidths]);

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
          <TimelineTextRow key={i} row={row} colWidths={colWidths} />
        ))}
      </pre>
    </div>
  );
}

function TimelineTextRow({ row, colWidths }: { row: MultiRow; colWidths: number[] }) {
  const worstStatus = row.gutters.reduce<DiffStatus>(
    (acc, s) => (statusPriority(s) > statusPriority(acc) ? s : acc),
    "unchanged"
  );
  const cls = getRowClass(worstStatus);

  return (
    <span className={`diff-text-row ${cls}`}>
      {row.cells.map((cell, c) => (
        <span key={c}>
          <span className="diff-text-left">{cell.padEnd(colWidths[c])}</span>
          {c < row.gutters.length && (
            <span className="diff-text-gutter">{" " + getGutterSymbol(row.gutters[c]) + " "}</span>
          )}
        </span>
      ))}
      {"\n"}
    </span>
  );
}

function statusPriority(s: DiffStatus): number {
  switch (s) {
    case "unchanged": return 0;
    case "moved": return 1;
    case "renamed": return 2;
    case "changed": return 3;
    case "added": return 4;
    case "removed": return 4;
  }
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

function buildMultiAlignedRows(
  docs: TreeboxDocument[],
  diffs: TreeboxDiff[]
): MultiRow[] {
  if (docs.length === 0) return [];
  if (docs.length === 1) {
    const lines = flattenTree(docs[0]);
    return lines.map((l) => ({ cells: [l], gutters: [] }));
  }

  const pairMaps = diffs.map((diff) => {
    const leftToRight = new Map<NodeId, NodeId>();
    const rightToLeft = new Map<NodeId, NodeId>();
    const pairStatus = new Map<string, DiffStatus>();
    const removedIds = new Set<NodeId>();

    for (const pair of diff.nodePairs) {
      if (pair.leftNodeId && pair.rightNodeId) {
        leftToRight.set(pair.leftNodeId, pair.rightNodeId);
        rightToLeft.set(pair.rightNodeId, pair.leftNodeId);
        pairStatus.set(`${pair.leftNodeId}:${pair.rightNodeId}`, pair.status);
      }
      if (pair.status === "removed" && pair.leftNodeId) {
        removedIds.add(pair.leftNodeId);
      }
    }
    return { leftToRight, rightToLeft, pairStatus, removedIds };
  });

  const rows: MultiRow[] = [];

  function alignMulti(
    idSets: NodeId[][],
    prefixes: string[],
    isRoot: boolean
  ) {
    const n = idSets.length;
    const merged = mergeAligned(idSets, pairMaps);

    for (let mi = 0; mi < merged.length; mi++) {
      const entry = merged[mi];
      const isLastPerCol: boolean[] = [];
      for (let c = 0; c < n; c++) {
        const remaining = merged.slice(mi + 1);
        isLastPerCol.push(!remaining.some((m) => m.nodeIds[c] != null));
      }

      const cells: string[] = [];
      const gutters: DiffStatus[] = [];

      for (let c = 0; c < n; c++) {
        const nodeId = entry.nodeIds[c];
        const node = nodeId ? docs[c].nodes[nodeId] : null;
        const connector = isRoot ? ""
          : nodeId ? (isLastPerCol[c] ? "└── " : "├── ") : "";
        cells.push(node ? prefixes[c] + connector + formatNode(node) : "");

        if (c < n - 1) {
          gutters.push(entry.statuses[c]);
        }
      }

      rows.push({ cells, gutters });

      const nextPrefixes = prefixes.map((p, c) => {
        if (isRoot) return p;
        return p + (entry.nodeIds[c] ? (isLastPerCol[c] ? "    " : "│   ") : "");
      });

      const childSets = entry.nodeIds.map((nid, c) => {
        const node = nid ? docs[c].nodes[nid] : null;
        return node ? node.children : [];
      });

      const hasAnyChildren = childSets.some((cs) => cs.length > 0);
      if (hasAnyChildren) {
        alignMulti(childSets, nextPrefixes, false);
      }
    }
  }

  const rootSets = docs.map((d) => d.rootIds);
  const initPrefixes = docs.map(() => "");
  alignMulti(rootSets, initPrefixes, true);

  return rows;
}

type MergedEntry = {
  nodeIds: (NodeId | null)[];
  statuses: DiffStatus[];
};

function mergeAligned(
  idSets: NodeId[][],
  pairMaps: { leftToRight: Map<NodeId, NodeId>; rightToLeft: Map<NodeId, NodeId>; pairStatus: Map<string, DiffStatus>; removedIds: Set<NodeId> }[]
): MergedEntry[] {
  const n = idSets.length;
  if (n === 0) return [];

  const positions: number[] = new Array(n).fill(0);
  const used: Set<NodeId>[] = idSets.map(() => new Set());
  const result: MergedEntry[] = [];

  while (true) {
    let anchor = -1;
    for (let c = 0; c < n; c++) {
      if (positions[c] < idSets[c].length) {
        anchor = c;
        break;
      }
    }
    if (anchor === -1) break;

    const anchorId = idSets[anchor][positions[anchor]];
    const entry: MergedEntry = {
      nodeIds: new Array(n).fill(null),
      statuses: new Array(n - 1).fill("unchanged"),
    };
    entry.nodeIds[anchor] = anchorId;
    used[anchor].add(anchorId);
    positions[anchor]++;

    let currentId: NodeId | null = anchorId;
    for (let c = anchor + 1; c < n; c++) {
      if (currentId == null) break;
      const map = pairMaps[c - 1];
      const rightId = map.leftToRight.get(currentId);
      if (rightId && idSets[c].includes(rightId) && !used[c].has(rightId)) {
        entry.nodeIds[c] = rightId;
        entry.statuses[c - 1] = map.pairStatus.get(`${currentId}:${rightId}`) ?? "unchanged";
        used[c].add(rightId);
        const idx = idSets[c].indexOf(rightId);
        if (idx === positions[c]) positions[c]++;
        currentId = rightId;
      } else {
        entry.statuses[c - 1] = currentId ? "removed" : "unchanged";
        currentId = null;
      }
    }

    currentId = anchorId;
    for (let c = anchor - 1; c >= 0; c--) {
      if (currentId == null) break;
      const map = pairMaps[c];
      const leftId = map.rightToLeft.get(currentId);
      if (leftId && idSets[c].includes(leftId) && !used[c].has(leftId)) {
        entry.nodeIds[c] = leftId;
        entry.statuses[c] = map.pairStatus.get(`${leftId}:${currentId}`) ?? "unchanged";
        used[c].add(leftId);
        const idx = idSets[c].indexOf(leftId);
        if (idx === positions[c]) positions[c]++;
        currentId = leftId;
      } else {
        currentId = null;
      }
    }

    for (let c = 0; c < n - 1; c++) {
      if (entry.nodeIds[c] == null && entry.nodeIds[c + 1] != null) {
        entry.statuses[c] = "added";
      } else if (entry.nodeIds[c] != null && entry.nodeIds[c + 1] == null) {
        entry.statuses[c] = "removed";
      }
    }

    result.push(entry);
  }

  return result;
}

function flattenTree(doc: TreeboxDocument): string[] {
  const lines: string[] = [];
  function walk(ids: NodeId[], prefix: string, isRoot: boolean) {
    for (let i = 0; i < ids.length; i++) {
      const node = doc.nodes[ids[i]];
      if (!node) continue;
      const isLast = i === ids.length - 1;
      const connector = isRoot ? "" : (isLast ? "└── " : "├── ");
      lines.push(prefix + connector + formatNode(node));
      const childPrefix = isRoot ? prefix : prefix + (isLast ? "    " : "│   ");
      walk(node.children, childPrefix, false);
    }
  }
  walk(doc.rootIds, "", true);
  return lines;
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
