import { EditorView, Decoration, ViewPlugin, DecorationSet, ViewUpdate } from "@codemirror/view";
import type { Range } from "@codemirror/state";

type DecoRange = Range<Decoration>;

function pushDeco(ranges: DecoRange[], from: number, to: number, deco: Decoration): void {
  if (to <= from) return; // skip empty/invalid ranges
  ranges.push(deco.range(from, to));
}

const connectorDeco = Decoration.mark({ class: "cm-treebox-connector" });
const nameDeco = Decoration.mark({ class: "cm-treebox-name" });
const classDeco = Decoration.mark({ class: "cm-treebox-class" });
const propKeyDeco = Decoration.mark({ class: "cm-treebox-prop-key" });
const propValueDeco = Decoration.mark({ class: "cm-treebox-prop-value" });
const commentDeco = Decoration.mark({ class: "cm-treebox-comment" });
const statusAddedDeco = Decoration.mark({ class: "cm-treebox-status-added" });
const statusModifiedDeco = Decoration.mark({ class: "cm-treebox-status-modified" });
const statusRemovedDeco = Decoration.mark({ class: "cm-treebox-status-removed" });
const tagDeco = Decoration.mark({ class: "cm-treebox-tag" });
const attrKeyDeco = Decoration.mark({ class: "cm-treebox-attr-key" });
const idCaptureDeco = Decoration.mark({ class: "cm-treebox-id" });
const punctDeco = Decoration.mark({ class: "cm-treebox-punct" });
const noteDeco = Decoration.mark({ class: "cm-treebox-note" });

function buildDecorations(view: EditorView): DecorationSet {
  const ranges: DecoRange[] = [];
  let inNote = false;

  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos < to; ) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;
      inNote = decorateLine(ranges, text, line.from, inNote);
      pos = line.to + 1;
    }
  }

  // Sort on the way in (second arg) so callers may push ranges in any order —
  // e.g. an <id> written before the { } block won't violate range ordering.
  return Decoration.set(ranges, true);
}

function decorateLine(
  ranges: DecoRange[],
  text: string,
  lineFrom: number,
  inNote: boolean
): boolean {
  if (!text.trim()) return inNote;

  // Inside multiline note: check for closing */
  if (inNote) {
    const closeIdx = text.indexOf("*/");
    if (closeIdx !== -1) {
      pushDeco(ranges, lineFrom, lineFrom + closeIdx + 2, noteDeco);
      // Continue parsing rest of line after */
      // (rare case, usually note closes on its own line)
      return false;
    }
    pushDeco(ranges, lineFrom, lineFrom + text.length, noteDeco);
    return true;
  }

  const trimmed = text.trimStart();

  // Full-line comment: # at start
  if (trimmed.startsWith("#") && (trimmed.length === 1 || trimmed[1] === " ")) {
    pushDeco(ranges, lineFrom, lineFrom + text.length, commentDeco);
    return false;
  }

  // Standalone note line: starts with /* (after stripping connectors)
  const strippedForNote = trimmed.replace(/^[│├└─┬┤┘┐┌┼\s]+/, "");
  if (strippedForNote.startsWith("/*")) {
    const closeIdx = text.indexOf("*/", text.indexOf("/*") + 2);
    if (closeIdx !== -1) {
      pushDeco(ranges, lineFrom, lineFrom + closeIdx + 2, noteDeco);
      return false;
    }
    pushDeco(ranges, lineFrom, lineFrom + text.length, noteDeco);
    return true;
  }

  let offset = 0;

  // Connectors: Unicode box-drawing
  const connectorMatch = text.match(/^[│├└─┬┤┘┐┌┼\s]*(?:├──|└──|├─|└─)?/);
  if (connectorMatch && connectorMatch[0].length > 0 && /[│├└─]/.test(connectorMatch[0])) {
    pushDeco(ranges, lineFrom, lineFrom + connectorMatch[0].length, connectorDeco);
    offset = connectorMatch[0].length;
  } else {
    // Chevron style: > or >>
    const chevronMatch = text.match(/^(>+)\s/);
    if (chevronMatch) {
      pushDeco(ranges, lineFrom, lineFrom + chevronMatch[1].length, connectorDeco);
      offset = chevronMatch[0].length;
    } else {
      // Pipe style: | | +
      const pipeMatch = text.match(/^([|+\s]*[+|])\s/);
      if (pipeMatch && /[|]/.test(pipeMatch[1])) {
        pushDeco(ranges, lineFrom, lineFrom + pipeMatch[0].length, connectorDeco);
        offset = pipeMatch[0].length;
      }
    }
  }

  const rest = text.slice(offset);
  let cursor = 0;

  // DisplayStatus prefix: + ~ -
  if (rest.startsWith("+ ")) {
    pushDeco(ranges, lineFrom + offset, lineFrom + offset + 1, statusAddedDeco);
    cursor = 2;
  } else if (rest.startsWith("~ ")) {
    pushDeco(ranges, lineFrom + offset, lineFrom + offset + 1, statusModifiedDeco);
    cursor = 2;
  } else if (rest.startsWith("- ")) {
    pushDeco(ranges, lineFrom + offset, lineFrom + offset + 1, statusRemovedDeco);
    cursor = 2;
  }

  // Find key positions in rest (after cursor)
  const payload = rest.slice(cursor);
  const abs = lineFrom + offset + cursor;

  // Find boundaries: [, {, <, //,  /*
  let classIdx = -1;
  let blockStart = -1;
  let blockEnd = -1;
  let idStart = -1;
  let idEnd = -1;
  let commentIdx = -1;
  let noteStartIdx = -1;

  let inQuotes = false;
  let braceDepth = 0;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (inQuotes) continue;

    if (ch === '/' && i + 1 < payload.length && braceDepth === 0) {
      if (payload[i + 1] === '/' && commentIdx === -1) { commentIdx = i; break; }
      if (payload[i + 1] === '*' && noteStartIdx === -1) { noteStartIdx = i; break; }
    }
    if (ch === '[' && classIdx === -1 && braceDepth === 0) classIdx = i;
    if (ch === '{' && blockStart === -1) { blockStart = i; braceDepth++; }
    else if (ch === '{') braceDepth++;
    if (ch === '}' && braceDepth > 0) { braceDepth--; if (braceDepth === 0) blockEnd = i; }
    if (ch === '<' && braceDepth === 0 && idStart === -1) idStart = i;
    if (ch === '>' && idStart !== -1 && idEnd === -1) idEnd = i;
  }

  // Name: from cursor to first [ or { or < or // or /*
  let nameEnd = payload.length;
  if (classIdx >= 0) nameEnd = Math.min(nameEnd, classIdx);
  if (blockStart >= 0) nameEnd = Math.min(nameEnd, blockStart);
  if (idStart >= 0) nameEnd = Math.min(nameEnd, idStart);
  if (commentIdx >= 0) nameEnd = Math.min(nameEnd, commentIdx);
  if (noteStartIdx >= 0) nameEnd = Math.min(nameEnd, noteStartIdx);

  const nameText = payload.slice(0, nameEnd).trimEnd();
  if (nameText.length > 0) {
    pushDeco(ranges, abs, abs + nameText.length, nameDeco);
  }

  // [ClassName]
  if (classIdx >= 0) {
    const closeIdx = payload.indexOf(']', classIdx);
    if (closeIdx >= 0) {
      pushDeco(ranges, abs + classIdx, abs + closeIdx + 1, classDeco);
    }
  }

  // { block }
  if (blockStart >= 0 && blockEnd >= 0) {
    pushDeco(ranges, abs + blockStart, abs + blockStart + 1, punctDeco);
    decorateBlock(ranges, payload.slice(blockStart + 1, blockEnd), abs + blockStart + 1);
    pushDeco(ranges, abs + blockEnd, abs + blockEnd + 1, punctDeco);
  }

  // <id>
  if (idStart >= 0 && idEnd >= 0) {
    pushDeco(ranges, abs + idStart, abs + idEnd + 1, idCaptureDeco);
  }

  // // comment
  if (commentIdx >= 0) {
    pushDeco(ranges, abs + commentIdx, abs + payload.length, commentDeco);
  }

  // /* note */ (inline or start of multiline)
  if (noteStartIdx >= 0 && (commentIdx === -1 || noteStartIdx < commentIdx)) {
    const noteCloseIdx = payload.indexOf("*/", noteStartIdx + 2);
    if (noteCloseIdx >= 0) {
      pushDeco(ranges, abs + noteStartIdx, abs + noteCloseIdx + 2, noteDeco);
      return false;
    }
    pushDeco(ranges, abs + noteStartIdx, abs + payload.length, noteDeco);
    return true;
  }

  return false;
}

function decorateBlock(
  ranges: DecoRange[],
  block: string,
  blockAbs: number
): void {
  let i = 0;
  while (i < block.length) {
    // Skip whitespace
    while (i < block.length && block[i] === ' ') i++;
    if (i >= block.length) break;

    // Comma
    if (block[i] === ',') {
      pushDeco(ranges, blockAbs + i, blockAbs + i + 1, punctDeco);
      i++;
      continue;
    }

    // Tag: #Name
    if (block[i] === '#') {
      const start = i;
      i++;
      while (i < block.length && block[i] !== ',' && block[i] !== ' ') i++;
      pushDeco(ranges, blockAbs + start, blockAbs + i, tagDeco);
      continue;
    }

    // Attribute: @Key = Value
    if (block[i] === '@') {
      const start = i;
      i++;
      while (i < block.length && block[i] !== '=' && block[i] !== ',') i++;
      pushDeco(ranges, blockAbs + start, blockAbs + i, attrKeyDeco);
      // Skip whitespace and =
      while (i < block.length && block[i] === ' ') i++;
      if (i < block.length && block[i] === '=') {
        pushDeco(ranges, blockAbs + i, blockAbs + i + 1, punctDeco);
        i++;
        while (i < block.length && block[i] === ' ') i++;
        const valStart = i;
        i = skipValue(block, i);
        if (i > valStart) pushDeco(ranges, blockAbs + valStart, blockAbs + i, propValueDeco);
      }
      continue;
    }

    // Property: Key = Value
    const keyStart = i;
    while (i < block.length && block[i] !== '=' && block[i] !== ',') i++;
    const keyEnd = i;
    const key = block.slice(keyStart, keyEnd).trimEnd();
    if (key.length > 0) {
      pushDeco(ranges, blockAbs + keyStart, blockAbs + keyStart + key.length, propKeyDeco);
    }
    while (i < block.length && block[i] === ' ') i++;
    if (i < block.length && block[i] === '=') {
      pushDeco(ranges, blockAbs + i, blockAbs + i + 1, punctDeco);
      i++;
      while (i < block.length && block[i] === ' ') i++;
      const valStart = i;
      i = skipValue(block, i);
      if (i > valStart) pushDeco(ranges, blockAbs + valStart, blockAbs + i, propValueDeco);
    }
  }
}

function skipValue(text: string, start: number): number {
  let i = start;
  if (i < text.length && text[i] === '"') {
    i++;
    while (i < text.length && text[i] !== '"') {
      if (text[i] === '\\') i++;
      i++;
    }
    if (i < text.length) i++;
    return i;
  }
  while (i < text.length && text[i] !== ',') i++;
  while (i > start && text[i - 1] === ' ') i--;
  return i;
}

export const treeboxHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

export const treeboxHighlightTheme = EditorView.baseTheme({
  ".cm-treebox-connector": { color: "#6c7086" },
  ".cm-treebox-name": { color: "#cdd6f4", fontWeight: "600" },
  ".cm-treebox-class": { color: "#cba6f7" },
  ".cm-treebox-prop-key": { color: "#fab387" },
  ".cm-treebox-prop-value": { color: "#a6e3a1" },
  ".cm-treebox-comment": { color: "#6c7086", fontStyle: "italic" },
  ".cm-treebox-status-added": { color: "#a6e3a1" },
  ".cm-treebox-status-modified": { color: "#fab387" },
  ".cm-treebox-status-removed": { color: "#f38ba8" },
  ".cm-treebox-tag": { color: "#f9e2af" },
  ".cm-treebox-attr-key": { color: "#74c7ec" },
  ".cm-treebox-id": { color: "#89b4fa" },
  ".cm-treebox-punct": { color: "#6c7086" },
  ".cm-treebox-note": { color: "#6c7086", fontStyle: "italic" },
});
