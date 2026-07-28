import { decompressFromEncodedURIComponent } from "lz-string";
import type { TreeboxDocument, TreeboxNode } from "../model/types";
import type { CompactDocument, CompactMultiPayload, CompactAnimatePayload } from "./encodeSharePayload";

export type DecodedSingle = { kind: "single"; doc: TreeboxDocument };
export type DecodedMulti = { kind: "multi"; mode: string; docs: TreeboxDocument[]; labels?: (string | undefined)[] };
export type DecodedAnimate = {
  kind: "animate";
  keyframes: Array<{ time: number; easing?: string; label?: string; document: TreeboxDocument }>;
  labels: Array<{ startTime: number; endTime: number; text: string }>;
  duration: number;
  loop: boolean;
  speed: number;
};
export type DecodeResult = DecodedSingle | DecodedMulti | DecodedAnimate;

export function decodeSharePayload(payload: string): TreeboxDocument | null {
  const result = decodeSharePayloadFull(payload);
  if (!result) return null;
  if (result.kind === "single") return result.doc;
  if (result.kind === "multi") return result.docs[0] ?? null;
  if (result.kind === "animate") return result.keyframes[0]?.document ?? null;
  return null;
}

export function decodeSharePayloadFull(payload: string): DecodeResult | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;

    const parsed = JSON.parse(json);
    if (parsed.v === 3) {
      const anim = parsed as CompactAnimatePayload;
      return {
        kind: "animate",
        keyframes: anim.kf.map(kf => ({
          time: kf.t,
          easing: kf.e,
          label: kf.l,
          document: fromCompact(kf.doc),
        })),
        labels: (anim.labels ?? []).map(l => ({ startTime: l.s, endTime: l.e, text: l.tx })),
        duration: anim.dur,
        loop: anim.loop,
        speed: anim.spd,
      };
    }
    if (parsed.v === 2) {
      const multi = parsed as CompactMultiPayload;
      const docs = multi.docs.map(fromCompact);
      return { kind: "multi", mode: multi.m, docs, labels: multi.labels };
    }
    if (parsed.v === 1) {
      return { kind: "single", doc: fromCompact(parsed as CompactDocument) };
    }
    return null;
  } catch {
    return null;
  }
}

function fromCompact(compact: CompactDocument): TreeboxDocument {
  const nodes: Record<string, TreeboxNode> = {};
  for (const [id, cn] of Object.entries(compact.n)) {
    nodes[id] = {
      id,
      name: cn.nm,
      className: cn.cl,
      props: (cn.p ?? {}) as Record<string, string | number | boolean | null>,
      children: cn.ch ?? [],
      comment: cn.cm,
      displayStatus: cn.ds as TreeboxNode["displayStatus"],
      note: cn.nt,
      ...(cn.tg ? { tags: cn.tg } : {}),
      ...(cn.at ? { attributes: cn.at as Record<string, string | number | boolean | null> } : {}),
    };
  }

  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: compact.id,
    title: compact.t,
    createdAt: now,
    updatedAt: now,
    rootIds: compact.r,
    nodes,
    viewState: { expandedNodeIds: Object.keys(nodes) },
  };
}
