import type {
  TreeboxDocument,
  TreeboxNode,
  TreeboxValue,
  FormatSettings,
  NodeId,
} from "../model/types";
import { DEFAULT_FORMAT_SETTINGS } from "../model/types";

export function serializeTreeText(
  doc: TreeboxDocument,
  settings: FormatSettings = DEFAULT_FORMAT_SETTINGS
): string {
  const lines: string[] = [];

  for (let i = 0; i < doc.rootIds.length; i++) {
    serializeNode(doc, doc.rootIds[i], "", true, lines, settings);
  }

  return lines.join("\n");
}

function serializeNode(
  doc: TreeboxDocument,
  nodeId: NodeId,
  prefix: string,
  isRoot: boolean,
  lines: string[],
  settings: FormatSettings
): void {
  const node = doc.nodes[nodeId];
  if (!node) return;

  let line = formatNodeLine(node, prefix, isRoot, settings);
  if (node.note) {
    line += formatNote(node.note);
  }
  lines.push(...line.split("\n"));

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const isLast = i === children.length - 1;
    const childPrefix = isRoot
      ? isLast
        ? "└── "
        : "├── "
      : prefix + (isLast ? "└── " : "├── ");
    const continuationPrefix = isRoot
      ? isLast
        ? "    "
        : "│   "
      : prefix + (isLast ? "    " : "│   ");

    serializeNodeChild(
      doc,
      children[i],
      childPrefix,
      continuationPrefix,
      lines,
      settings
    );
  }
}

function serializeNodeChild(
  doc: TreeboxDocument,
  nodeId: NodeId,
  linePrefix: string,
  continuationPrefix: string,
  lines: string[],
  settings: FormatSettings
): void {
  const node = doc.nodes[nodeId];
  if (!node) return;

  let line = linePrefix + formatNodePayload(node, settings);
  if (node.note) {
    line += formatNote(node.note);
  }
  lines.push(...line.split("\n"));

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const isLast = i === children.length - 1;
    const childPrefix = continuationPrefix + (isLast ? "└── " : "├── ");
    const childContinuation = continuationPrefix + (isLast ? "    " : "│   ");

    serializeNodeChild(
      doc,
      children[i],
      childPrefix,
      childContinuation,
      lines,
      settings
    );
  }
}

function formatNodeLine(
  node: TreeboxNode,
  _prefix: string,
  isRoot: boolean,
  settings: FormatSettings
): string {
  if (isRoot) {
    return formatNodePayload(node, settings);
  }
  return formatNodePayload(node, settings);
}

function formatNodePayload(
  node: TreeboxNode,
  settings: FormatSettings
): string {
  let result = "";
  if (node.displayStatus === "added") result += "+ ";
  else if (node.displayStatus === "modified") result += "~ ";
  else if (node.displayStatus === "removed") result += "- ";
  result += formatName(node.name, settings);

  if (node.className || settings.showEmptyClassBrackets) {
    result += ` [${node.className ?? ""}]`;
  }

  const blockStr = formatBlock(node, settings);
  if (blockStr) {
    result += ` { ${blockStr} }`;
  }

  if (node.id && (settings.includeAllIds || (!node.id.startsWith("n_") && !settings.showInternalIds))) {
    result += ` <${node.id}>`;
  }

  if (node.comment) {
    result += `  // ${node.comment}`;
  }

  return result;
}

function formatName(name: string, settings: FormatSettings): string {
  const reserved = /[[\]{},=<>@#]/;
  const needsQuotes =
    settings.quoteNames === "always" ||
    (settings.quoteNames === "auto" &&
      (reserved.test(name) ||
        name.startsWith(" ") ||
        name.endsWith(" ") ||
        name.startsWith('"')));

  if (needsQuotes) {
    return `"${name}"`;
  }
  return name;
}

function formatBlock(
  node: TreeboxNode,
  settings: FormatSettings
): string {
  const parts: string[] = [];

  if (node.tags && node.tags.length > 0) {
    for (const tag of node.tags) {
      parts.push(`#${tag}`);
    }
  }

  if (node.attributes && Object.keys(node.attributes).length > 0) {
    for (const [key, value] of Object.entries(node.attributes)) {
      parts.push(`@${key} = ${formatValue(value)}`);
    }
  }

  const propsToShow = buildPropsForDisplay(node, settings);
  for (const [key, value] of Object.entries(propsToShow)) {
    parts.push(`${key} = ${formatValue(value)}`);
  }

  return parts.join(", ");
}

function buildPropsForDisplay(
  node: TreeboxNode,
  settings: FormatSettings
): Record<string, TreeboxValue> {
  const result: Record<string, TreeboxValue> = {};

  if (settings.showInternalIds) {
    result["id"] = node.id;
  }

  if (!settings.sortProps) {
    Object.assign(result, node.props);
    return result;
  }

  const keys = Object.keys(node.props);
  const priority = ["HistoryId", "AssetId", "Version"];
  const prioritized = priority.filter((k) => keys.includes(k));
  const rest = keys
    .filter((k) => !priority.includes(k))
    .sort((a, b) => a.localeCompare(b));

  for (const key of [...prioritized, ...rest]) {
    result[key] = node.props[key];
  }

  return result;
}

function formatValue(value: TreeboxValue): string {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return String(value);
}

function formatNote(note: string): string {
  const noteLines = note.split("\n");
  if (noteLines.length === 1) {
    return `  /* ${noteLines[0]} */`;
  }
  let result = `  /* ${noteLines[0]}`;
  for (let i = 1; i < noteLines.length; i++) {
    result += `\n${noteLines[i]}`;
  }
  result += " */";
  return result;
}
