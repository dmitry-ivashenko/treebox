import { compressToEncodedURIComponent } from "lz-string";
import type { TreeboxDocument } from "../model/types";

export type CompactDocument = {
  v: 1;
  id: string;
  t: string;
  r: string[];
  n: Record<string, CompactNode>;
};

export type CompactMultiPayload = {
  v: 2;
  m: string;
  docs: CompactDocument[];
  /** Per-doc labels (Timeline steps), parallel to `docs`. Omitted if all empty. */
  labels?: (string | undefined)[];
};

export type CompactAnimatePayload = {
  v: 3;
  m: "animate";
  kf: Array<{ t: number; e?: string; l?: string; doc: CompactDocument }>;
  labels?: Array<{ s: number; e: number; tx: string }>;
  dur: number;
  loop: boolean;
  spd: number;
};

type CompactNode = {
  nm: string;
  cl?: string;
  p?: Record<string, unknown>;
  ch?: string[];
  cm?: string;
  ds?: string;
  nt?: string;
  tg?: string[];
  at?: Record<string, unknown>;
};

export function encodeSharePayload(doc: TreeboxDocument): string {
  const compact = toCompact(doc);
  return compressToEncodedURIComponent(JSON.stringify(compact));
}

export function encodeMultiSharePayload(mode: string, docs: TreeboxDocument[], labels?: (string | undefined)[]): string {
  const payload: CompactMultiPayload = {
    v: 2,
    m: mode,
    docs: docs.map(toCompact),
    // Only carry labels if at least one is set, to keep diff payloads lean.
    labels: labels && labels.some(Boolean) ? labels : undefined,
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function encodeAnimateSharePayload(animState: {
  keyframes: Array<{ time: number; easing?: string; label?: string; document: TreeboxDocument }>;
  labels: Array<{ startTime: number; endTime: number; text: string }>;
  duration: number;
  loop: boolean;
  speed: number;
}): string {
  const payload: CompactAnimatePayload = {
    v: 3,
    m: "animate",
    kf: animState.keyframes.map(kf => ({
      t: kf.time,
      e: kf.easing || undefined,
      l: kf.label || undefined,
      doc: toCompact(kf.document),
    })),
    labels: animState.labels.length > 0
      ? animState.labels.map(l => ({ s: l.startTime, e: l.endTime, tx: l.text }))
      : undefined,
    dur: animState.duration,
    loop: animState.loop,
    spd: animState.speed,
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function toCompact(doc: TreeboxDocument): CompactDocument {
  const nodes: Record<string, CompactNode> = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    const cn: CompactNode = { nm: node.name };
    if (node.className) cn.cl = node.className;
    if (Object.keys(node.props).length > 0) cn.p = node.props;
    if (node.children.length > 0) cn.ch = node.children;
    if (node.comment) cn.cm = node.comment;
    if (node.displayStatus) cn.ds = node.displayStatus;
    if (node.note) cn.nt = node.note;
    if (node.tags && node.tags.length > 0) cn.tg = node.tags;
    if (node.attributes && Object.keys(node.attributes).length > 0) cn.at = node.attributes;
    nodes[id] = cn;
  }
  return {
    v: 1,
    id: doc.id,
    t: doc.title,
    r: doc.rootIds,
    n: nodes,
  };
}

export const URL_WARNING_BYTES = 4000;
export const URL_DANGER_BYTES = 12000;

export function getPayloadSize(doc: TreeboxDocument): number {
  return encodeSharePayload(doc).length;
}

export function getMultiPayloadSize(mode: string, docs: TreeboxDocument[], labels?: (string | undefined)[]): number {
  return encodeMultiSharePayload(mode, docs, labels).length;
}
