import type {
  NodeId,
  ParseError,
  ParseResult,
  NodeSourceRange,
  TreeboxDocument,
  TreeboxNode,
} from "../model/types";
import { createDocument } from "../model/createDocument";
import { generateNodeId } from "../model/createNode";
import { parseNodeLine } from "./parseNodeLine";

export function parseTreeText(
  text: string,
  existingDocId?: string
): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const sourceMap: NodeSourceRange[] = [];

  const lines = text.split(/\r?\n/);
  const nodes: Record<NodeId, TreeboxNode> = {};
  const rootIds: NodeId[] = [];

  type StackEntry = { id: NodeId; depth: number };
  const stack: StackEntry[] = [];

  let lastNodeId: NodeId | null = null;

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].replace(/^[│├└─┬┤┘┐┌┼\s]+/, "").trim();
    if (stripped.startsWith("/*")) {
      i = collectNote(lines, i, stripped, lastNodeId, nodes);
      continue;
    }

    const noteIdx = findInlineNoteStart(lines[i]);
    const lineToParse = noteIdx !== -1 ? lines[i].slice(0, noteIdx) : lines[i];
    const parsed = parseNodeLine(lineToParse, i + 1);

    if (parsed.isEmpty || parsed.isComment) continue;

    if (!parsed.name) {
      errors.push({
        line: i + 1,
        code: "EMPTY_NAME",
        message: "Node name is empty.",
        severity: "error",
      });
      continue;
    }

    const nodeId = parsed.explicitId ?? generateNodeId();

    if (nodes[nodeId]) {
      errors.push({
        line: i + 1,
        code: "DUPLICATE_ID",
        message: `Duplicate node id: ${nodeId}`,
        severity: "error",
      });
      continue;
    }

    const node: TreeboxNode = {
      id: nodeId,
      name: parsed.name,
      className: parsed.className,
      props: parsed.props,
      children: [],
      ...(parsed.comment ? { comment: parsed.comment } : {}),
      ...(parsed.displayStatus ? { displayStatus: parsed.displayStatus } : {}),
      ...(parsed.tags ? { tags: parsed.tags } : {}),
      ...(parsed.attributes ? { attributes: parsed.attributes } : {}),
    };

    nodes[nodeId] = node;
    lastNodeId = nodeId;

    if (noteIdx !== -1) {
      const inlineContent = lines[i].slice(noteIdx + 2);
      if (inlineContent.trimEnd().endsWith("*/")) {
        node.note = inlineContent.slice(0, inlineContent.lastIndexOf("*/")).trim();
      } else {
        const noteLines: string[] = [];
        if (inlineContent.trim()) noteLines.push(inlineContent.trim());
        let j = i + 1;
        while (j < lines.length) {
          const raw = lines[j];
          const trimmed = raw.replace(/^[│├└─┬┤┘┐┌┼\s]+/, "").trim();
          if (trimmed.endsWith("*/")) {
            const cleaned = raw.replace(/^[│├└─┬┤┘┐┌┼]+/, "");
            const last = cleaned.slice(0, cleaned.lastIndexOf("*/"));
            if (last.trim()) noteLines.push(last.trimEnd());
            i = j;
            break;
          }
          noteLines.push(raw.replace(/^[│├└─┬┤┘┐┌┼]+/, ""));
          j++;
        }
        if (j >= lines.length) i = j - 1;
        node.note = noteLines.join("\n");
      }
    }

    sourceMap.push({
      nodeId,
      lineStart: i + 1,
      lineEnd: i + 1,
      columnStart: 0,
      columnEnd: lines[i].length,
    });

    if (parsed.depth === 0) {
      rootIds.push(nodeId);
      stack.length = 0;
      stack.push({ id: nodeId, depth: 0 });
    } else {
      while (stack.length > 0 && stack[stack.length - 1].depth >= parsed.depth) {
        stack.pop();
      }

      if (stack.length === 0) {
        errors.push({
          line: i + 1,
          code: "ORPHAN_NODE",
          message: "Child node appears without parent.",
          severity: "error",
        });
        rootIds.push(nodeId);
        stack.push({ id: nodeId, depth: parsed.depth });
      } else {
        const parentId = stack[stack.length - 1].id;
        nodes[parentId].children.push(nodeId);
        stack.push({ id: nodeId, depth: parsed.depth });
      }
    }
  }

  if (Object.keys(nodes).length === 0 && errors.length === 0) {
    const doc = createDocument({ id: existingDocId });
    return { ok: true, document: doc, errors: [], warnings: [], sourceMap: [] };
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, sourceMap };
  }

  const doc: TreeboxDocument = {
    schemaVersion: 1,
    id: existingDocId ?? createDocument().id,
    title: rootIds.length > 0 ? nodes[rootIds[0]].name : "Untitled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rootIds,
    nodes,
    viewState: { expandedNodeIds: Object.keys(nodes) },
  };

  return { ok: true, document: doc, errors: [], warnings, sourceMap };
}

function collectNote(
  lines: string[],
  startIdx: number,
  firstStripped: string,
  lastNodeId: NodeId | null,
  nodes: Record<NodeId, TreeboxNode>
): number {
  const noteLines: string[] = [];
  const firstContent = firstStripped.slice(2);
  if (firstContent.trimEnd().endsWith("*/")) {
    noteLines.push(firstContent.slice(0, firstContent.lastIndexOf("*/")).trim());
    if (lastNodeId && nodes[lastNodeId]) {
      nodes[lastNodeId].note = noteLines.filter(Boolean).join("\n");
    }
    return startIdx;
  }
  if (firstContent.trim()) noteLines.push(firstContent.trim());
  let i = startIdx + 1;
  while (i < lines.length) {
    const raw = stripTreeConnectors(lines[i]);
    if (raw.trimEnd().endsWith("*/")) {
      const last = raw.slice(0, raw.lastIndexOf("*/"));
      if (last.trim()) noteLines.push(last.trimEnd());
      break;
    }
    noteLines.push(raw);
    i++;
  }
  if (lastNodeId && nodes[lastNodeId]) {
    nodes[lastNodeId].note = noteLines.join("\n");
  }
  return i;
}

function stripTreeConnectors(line: string): string {
  return line.replace(/^[│├└─┬┤┘┐┌┼]+/, "").replace(/^\s{0,4}/, "");
}

function findInlineNoteStart(line: string): number {
  let inQuotes = false;
  let inParens = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === '(') inParens++;
      else if (ch === ')') inParens--;
      else if (ch === '/' && line[i + 1] === '*' && inParens === 0) {
        return i;
      }
    }
  }
  return -1;
}
