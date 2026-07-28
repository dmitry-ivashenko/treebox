import type { TreeboxValue, NodeDisplayStatus } from "../model/types";
import type { ParsedLine } from "./parserTypes";

const CONNECTOR_PATTERN = /^([│├└─┬┤┘┐┌┼\s]*(?:├──|└──|├─|└─|│\s{3}|│\s{2}|\s{4})*)\s*/;

export function inferDepth(prefix: string): number {
  const cleaned = prefix.replace(/[│├└─┬┤┘┐┌┼]/g, " ");
  const leadingSpaces = cleaned.length;
  return Math.floor(leadingSpaces / 4);
}

function inferDepthAscii(raw: string): { depth: number; payload: string } | null {
  // Chevron style: > Node, >> Node, >>> Node
  const chevronMatch = raw.match(/^(>+)\s+(.*)$/);
  if (chevronMatch) {
    return { depth: chevronMatch[1].length, payload: chevronMatch[2] };
  }

  // Plus/Pipe style: "| + Node" = depth 2, "| | + Node" = depth 3
  // Must have at least one | before +, otherwise it's a displayStatus prefix
  const plusPipeMatch = raw.match(/^((?:\|\s*)+)\+\s+(.*)$/);
  if (plusPipeMatch) {
    const prefix = plusPipeMatch[1];
    const pipeCount = (prefix.match(/\|/g) || []).length;
    return { depth: pipeCount + 1, payload: plusPipeMatch[2] };
  }
  // Standalone "+ Node" with no pipes = depth 1 (unambiguous tree child)
  // But we DON'T match it here — it's handled as displayStatus instead.

  // Indentation style: 2 spaces per level, no connector chars
  if (/^[ ]+[^ ]/.test(raw) && !/[│├└─┬┤┘┐┌┼]/.test(raw)) {
    const leadingSpaces = raw.length - raw.trimStart().length;
    if (leadingSpaces >= 2 && leadingSpaces % 2 === 0) {
      return { depth: leadingSpaces / 2, payload: raw.trimStart() };
    }
  }

  return null;
}

export function parseNodeLine(raw: string, lineNumber: number): ParsedLine {
  if (!raw.trim()) {
    return {
      lineNumber,
      raw,
      depth: 0,
      name: "",
      className: undefined,
      props: {},
      isComment: false,
      isEmpty: true,
    };
  }

  const trimmed = raw.trimStart();

  if (/^[│├└─┬┤┘┐┌┼\s]+$/.test(raw)) {
    return {
      lineNumber,
      raw,
      depth: 0,
      name: "",
      className: undefined,
      props: {},
      isComment: false,
      isEmpty: true,
    };
  }

  if (trimmed.startsWith("#") && !trimmed.startsWith("#{")) {
    // # at start = line comment, but #Tag inside {} is a tag
    // Only treat as comment if the line starts with # (after trim) and not inside a node
    const afterHash = trimmed.slice(1);
    if (!afterHash.match(/^[A-Za-z_]/)) {
      // Lines like "# comment" are comments; "#Tag" alone would be ambiguous but not realistic
      return {
        lineNumber,
        raw,
        depth: 0,
        name: "",
        className: undefined,
        props: {},
        isComment: true,
        isEmpty: false,
      };
    }
    return {
      lineNumber,
      raw,
      depth: 0,
      name: "",
      className: undefined,
      props: {},
      isComment: true,
      isEmpty: false,
    };
  }

  // Try Unicode connectors first
  let depth: number;
  let payload: string;

  const prefixMatch = raw.match(CONNECTOR_PATTERN);
  const prefix = prefixMatch ? prefixMatch[0] : "";

  if (prefix.length > 0 && /[│├└─]/.test(prefix)) {
    depth = inferDepth(prefix);
    payload = raw.slice(prefix.length).trimEnd();
    if (!payload && raw.trim()) {
      payload = raw.trim().replace(/^[│├└─┬┤┘┐┌┼\s]+/, "");
    }
  } else {
    // Try ASCII styles
    const ascii = inferDepthAscii(raw);
    if (ascii) {
      depth = ascii.depth;
      payload = ascii.payload.trimEnd();
    } else {
      depth = 0;
      payload = raw.trimEnd();
    }
  }

  let displayStatus: NodeDisplayStatus | undefined;
  if (payload.startsWith("+ ")) {
    displayStatus = "added";
    payload = payload.slice(2);
  } else if (payload.startsWith("~ ")) {
    displayStatus = "modified";
    payload = payload.slice(2);
  } else if (payload.startsWith("- ")) {
    displayStatus = "removed";
    payload = payload.slice(2);
  }

  const { body, comment } = extractComment(payload);
  const { name, className, props, explicitId, tags, attributes } = parsePayload(body);

  return {
    lineNumber,
    raw,
    depth,
    name,
    className,
    props,
    explicitId,
    comment,
    displayStatus,
    tags,
    attributes,
    isComment: false,
    isEmpty: false,
  };
}

function extractComment(payload: string): { body: string; comment?: string } {
  let inQuotes = false;
  let inBraces = 0;
  let inParens = 0;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === '{') inBraces++;
      else if (ch === '}') inBraces--;
      else if (ch === '(') inParens++;
      else if (ch === ')') inParens--;
      else if (ch === '/' && payload[i + 1] === '/' && inParens === 0 && inBraces === 0) {
        const body = payload.slice(0, i).trimEnd();
        const comment = payload.slice(i + 2).trim();
        return { body, comment: comment || undefined };
      }
    }
  }
  return { body: payload };
}

function parsePayload(payload: string): {
  name: string;
  className?: string;
  props: Record<string, TreeboxValue>;
  explicitId?: string;
  tags?: string[];
  attributes?: Record<string, TreeboxValue>;
} {
  let rest = payload;
  let name: string;
  let className: string | undefined;
  let props: Record<string, TreeboxValue> = {};
  let explicitId: string | undefined;
  let tags: string[] | undefined;
  let attributes: Record<string, TreeboxValue> | undefined;

  // Parse name
  if (rest.startsWith('"')) {
    const endQuote = rest.indexOf('"', 1);
    if (endQuote === -1) {
      name = rest.slice(1);
      rest = "";
    } else {
      name = rest.slice(1, endQuote);
      rest = rest.slice(endQuote + 1).trimStart();
    }
  } else {
    const classStart = rest.indexOf("[");
    const braceStart = rest.indexOf("{");
    const propsStart = rest.indexOf("(");
    const angleStart = rest.indexOf("<");

    let nameEnd = rest.length;
    if (classStart !== -1) nameEnd = Math.min(nameEnd, classStart);
    if (braceStart !== -1) nameEnd = Math.min(nameEnd, braceStart);
    if (propsStart !== -1) nameEnd = Math.min(nameEnd, propsStart);
    if (angleStart !== -1) nameEnd = Math.min(nameEnd, angleStart);

    name = rest.slice(0, nameEnd).trimEnd();
    rest = rest.slice(nameEnd).trimStart();
  }

  // Parse [ClassName], { block }/( props ), and <id> in ANY order.
  // We consume whichever token appears next and repeat, so that both
  // `Name [Class] { props } <id>` and `Name [Class] <id> { props }` work.
  let consumed = true;
  while (consumed && rest.length > 0) {
    consumed = false;

    // [ClassName]
    if (className === undefined && rest.startsWith("[")) {
      const classEnd = rest.indexOf("]");
      if (classEnd !== -1) {
        className = rest.slice(1, classEnd).trim();
        rest = rest.slice(classEnd + 1).trimStart();
        consumed = true;
        continue;
      }
    }

    // { ... } block (new syntax: tags, attributes, props)
    if (rest.startsWith("{")) {
      const braceEnd = rest.indexOf("}");
      if (braceEnd !== -1) {
        const blockStr = rest.slice(1, braceEnd);
        const parsed = parseBlock(blockStr);
        props = parsed.props;
        tags = parsed.tags.length > 0 ? parsed.tags : undefined;
        attributes = Object.keys(parsed.attributes).length > 0 ? parsed.attributes : undefined;
        rest = rest.slice(braceEnd + 1).trimStart();
        consumed = true;
        continue;
      }
    }

    // Legacy: ( ... ) as props only
    if (rest.startsWith("(")) {
      const propsEnd = rest.lastIndexOf(")");
      if (propsEnd !== -1) {
        const propsStr = rest.slice(1, propsEnd);
        props = parseProps(propsStr);
        rest = rest.slice(propsEnd + 1).trimStart();
        consumed = true;
        continue;
      }
    }

    // <id> capture
    if (explicitId === undefined && rest.startsWith("<")) {
      const angleEnd = rest.indexOf(">");
      if (angleEnd !== -1) {
        explicitId = rest.slice(1, angleEnd).trim();
        rest = rest.slice(angleEnd + 1).trimStart();
        consumed = true;
        continue;
      }
    }
  }

  // Legacy: id inside props
  if (!explicitId && "id" in props) {
    explicitId = String(props["id"]);
    delete props["id"];
  }

  return { name, className, props, explicitId, tags, attributes };
}

function parseBlock(blockStr: string): {
  tags: string[];
  attributes: Record<string, TreeboxValue>;
  props: Record<string, TreeboxValue>;
} {
  const tags: string[] = [];
  const attributes: Record<string, TreeboxValue> = {};
  const props: Record<string, TreeboxValue> = {};

  const items = splitBlockItems(blockStr);

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      tags.push(trimmed.slice(1));
    } else if (trimmed.startsWith("@")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(1, eqIdx).trim();
        const rawVal = trimmed.slice(eqIdx + 1).trim();
        attributes[key] = parseValueToken(rawVal);
      } else {
        attributes[trimmed.slice(1).trim()] = true;
      }
    } else {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const rawVal = trimmed.slice(eqIdx + 1).trim();
        props[key] = parseValueToken(rawVal);
      }
    }
  }

  return { tags, attributes, props };
}

function splitBlockItems(blockStr: string): string[] {
  const items: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < blockStr.length; i++) {
    const ch = blockStr[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === ',' && !inQuotes) {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) items.push(current);
  return items;
}

function parseValueToken(raw: string): TreeboxValue {
  if (raw.startsWith('"')) {
    let str = "";
    for (let i = 1; i < raw.length; i++) {
      if (raw[i] === '"') break;
      if (raw[i] === '\\' && i + 1 < raw.length) {
        i++;
        str += raw[i];
      } else {
        str += raw[i];
      }
    }
    return str;
  }
  return parseScalar(raw);
}

function parseProps(propsStr: string): Record<string, TreeboxValue> {
  const result: Record<string, TreeboxValue> = {};
  let i = 0;

  while (i < propsStr.length) {
    while (i < propsStr.length && (propsStr[i] === " " || propsStr[i] === ",")) i++;
    if (i >= propsStr.length) break;

    let key = "";
    while (i < propsStr.length && propsStr[i] !== "=") {
      key += propsStr[i];
      i++;
    }
    key = key.trim();
    if (!key) break;

    i++; // skip '='

    while (i < propsStr.length && propsStr[i] === " ") i++;

    let value: TreeboxValue;
    if (i < propsStr.length && propsStr[i] === '"') {
      i++;
      let str = "";
      while (i < propsStr.length && propsStr[i] !== '"') {
        if (propsStr[i] === "\\" && i + 1 < propsStr.length) {
          i++;
          str += propsStr[i];
        } else {
          str += propsStr[i];
        }
        i++;
      }
      i++;
      value = str;
    } else {
      let raw = "";
      while (i < propsStr.length && propsStr[i] !== ",") {
        raw += propsStr[i];
        i++;
      }
      raw = raw.trim();
      value = parseScalar(raw);
    }

    result[key] = value;
  }

  return result;
}

function parseScalar(raw: string): TreeboxValue {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  const num = Number(raw);
  if (!isNaN(num) && raw !== "") return num;
  return raw;
}
