import type { TreeboxDocument, TreeboxNode, TreeboxValue, NodeId, NodeDisplayStatus } from "../model/types";
import type { AnimateKeyframe } from "../tabs/types";
import type { TreeboxDiff } from "../diff/diffTypes";
import { diffDocuments } from "../diff/diffDocuments";
import { getClassIcon } from "../../features/explorer/classIcons";
import { getEasingFn } from "./easing";

const ROW_HEIGHT = 24;
const INDENT = 18;
const PADDING_LEFT = 8;
const STAGGER_DELAY = 0.02;

export type InterpolatedNode = {
  id: NodeId;
  name: string;
  className?: string;
  props: Record<string, TreeboxValue>;
  tags?: string[];
  attributes?: Record<string, TreeboxValue>;
  comment?: string;
  commentOpacity?: number;
  note?: string;
  noteOpacity?: number;
  displayStatus?: NodeDisplayStatus;
  statusOpacity?: number;
  hasPackage?: boolean;
  packageOpacity?: number;
  x: number;
  y: number;
  opacity: number;
  status: "present" | "entering" | "leaving";
  icon: { svg: string };
  noteLines: number;
};

type FlatNode = {
  id: NodeId;
  node: TreeboxNode;
  depth: number;
  index: number;
  yRow: number;
  hasPackage: boolean;
};

function flattenTree(doc: TreeboxDocument): FlatNode[] {
  const result: FlatNode[] = [];
  let yRow = 0;
  const walk = (ids: NodeId[], depth: number) => {
    for (const id of ids) {
      const node = doc.nodes[id];
      if (!node) continue;
      const hasPackage = node.children.some(cid => doc.nodes[cid]?.className === "PackageLink");
      result.push({ id, node, depth, index: result.length, yRow, hasPackage });
      yRow++;
      if (node.note) yRow += node.note.split("\n").length;
      walk(node.children, depth + 1);
    }
  };
  walk(doc.rootIds, 0);
  return result;
}

// Cache diffs by the *identity* of the two documents — never by keyframe id.
// Keyframe ids are not unique across imported animations (every share link
// reuses kf_0, kf_1, …) and an edited keyframe keeps its id while getting a
// fresh document object, so an id-keyed cache returns stale diffs from a
// previously opened tree (nodes silently vanish) or from before the last edit.
// Keying on the document objects sidesteps both: immutable updates produce new
// objects (auto-invalidation) and distinct trees never collide. During playback
// the document objects are stable, so we still hit the cache every frame.
const diffCache = new WeakMap<TreeboxDocument, WeakMap<TreeboxDocument, TreeboxDiff>>();

function getDiff(kfA: AnimateKeyframe, kfB: AnimateKeyframe): TreeboxDiff {
  let inner = diffCache.get(kfA.document);
  if (!inner) {
    inner = new WeakMap();
    diffCache.set(kfA.document, inner);
  }
  let cached = inner.get(kfB.document);
  if (!cached) {
    cached = diffDocuments(kfA.document, kfB.document);
    inner.set(kfB.document, cached);
  }
  return cached;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Typewriter transition between two strings that only animates the differing
 * "delta" — the shared prefix and suffix stay put, and just the changed middle
 * is erased then retyped. Adding one char to a long note no longer rewrites it.
 */
function typewriterDelta(prev: string, next: string, staggered: number): string | undefined {
  const minLen = Math.min(prev.length, next.length);
  let pre = 0;
  while (pre < minLen && prev[pre] === next[pre]) pre++;
  let suf = 0;
  while (
    suf < minLen - pre &&
    prev[prev.length - 1 - suf] === next[next.length - 1 - suf]
  ) suf++;

  const prefix = prev.slice(0, pre);
  const suffix = prev.slice(prev.length - suf);
  const midPrev = prev.slice(pre, prev.length - suf);
  const midNext = next.slice(pre, next.length - suf);

  const half = staggered * 2;
  let mid: string;
  if (half <= 1) {
    const remove = Math.floor(half * midPrev.length);
    mid = midPrev.slice(0, midPrev.length - remove);
  } else {
    const add = Math.floor((half - 1) * midNext.length);
    mid = midNext.slice(0, add);
  }
  return (prefix + mid + suffix) || undefined;
}

export function interpolateAt(
  keyframes: AnimateKeyframe[],
  time: number,
): InterpolatedNode[] {
  if (keyframes.length === 0) return [];

  // Find surrounding keyframes
  let prevIdx = 0;
  for (let i = keyframes.length - 1; i >= 0; i--) {
    if (keyframes[i].time <= time) { prevIdx = i; break; }
  }

  const prev = keyframes[prevIdx];
  const next = keyframes[prevIdx + 1];

  // If no next keyframe or at/past last, show static
  if (!next || time >= next.time) {
    const target = next && time >= next.time ? next : prev;
    return flattenTree(target.document).map(({ id, node, depth, yRow, hasPackage }) => ({
      id,
      name: node.name,
      className: node.className,
      props: node.props,
      tags: node.tags,
      attributes: node.attributes,
      comment: node.comment,
      note: node.note,
      displayStatus: node.displayStatus,
      hasPackage,
      noteLines: node.note ? node.note.split("\n").length : 0,
      x: depth * INDENT + PADDING_LEFT,
      y: yRow * ROW_HEIGHT,
      opacity: 1,
      status: "present" as const,
      icon: getClassIcon(node.className),
    }));
  }

  // Handle holdBefore on next keyframe
  const holdBefore = next.holdBefore ?? 0;
  const transitionStart = prev.time + holdBefore;
  if (time < transitionStart) {
    // Still in hold zone — show prev static
    return flattenTree(prev.document).map(({ id, node, depth, yRow, hasPackage }) => ({
      id,
      name: node.name,
      className: node.className,
      props: node.props,
      tags: node.tags,
      attributes: node.attributes,
      comment: node.comment,
      note: node.note,
      displayStatus: node.displayStatus,
      hasPackage,
      noteLines: node.note ? node.note.split("\n").length : 0,
      x: depth * INDENT + PADDING_LEFT,
      y: yRow * ROW_HEIGHT,
      opacity: 1,
      status: "present" as const,
      icon: getClassIcon(node.className),
    }));
  }

  // Interpolate between prev and next
  const transitionDuration = next.time - transitionStart;
  const rawProgress = transitionDuration > 0 ? (time - transitionStart) / transitionDuration : 1;
  const progress = Math.max(0, Math.min(1, rawProgress));
  const easingFn = getEasingFn(prev.easing);

  const diff = getDiff(prev, next);
  const prevFlat = flattenTree(prev.document);
  const nextFlat = flattenTree(next.document);

  const prevMap = new Map<NodeId, FlatNode>();
  prevFlat.forEach(fn => prevMap.set(fn.id, fn));
  const nextMap = new Map<NodeId, FlatNode>();
  nextFlat.forEach(fn => nextMap.set(fn.id, fn));

  const result: InterpolatedNode[] = [];
  const processed = new Set<NodeId>();
  const totalNodes = Math.max(prevFlat.length, nextFlat.length);
  const totalStagger = totalNodes * STAGGER_DELAY;

  for (const pair of diff.nodePairs) {
    if (pair.status === "unchanged" || pair.status === "changed" || pair.status === "moved" || pair.status === "renamed") {
      const leftId = pair.leftNodeId!;
      const rightId = pair.rightNodeId!;
      const prevNode = prevMap.get(leftId);
      const nextNode = nextMap.get(rightId);
      if (!prevNode || !nextNode) continue;

      const nodeIndex = Math.min(prevNode.index, nextNode.index);
      const staggered = applyStagger(progress, nodeIndex, totalStagger, easingFn);

      const pick = staggered >= 0.5 ? nextNode.node : prevNode.node;

      const prevName = prevNode.node.name;
      const nextName = nextNode.node.name;
      let interpolatedName: string;
      if (prevName === nextName) {
        interpolatedName = prevName;
      } else {
        const halfProgress = staggered * 2;
        if (halfProgress <= 1) {
          const charsToRemove = Math.floor(halfProgress * prevName.length);
          interpolatedName = prevName.slice(0, prevName.length - charsToRemove) || " ";
        } else {
          const charsToAdd = Math.floor((halfProgress - 1) * nextName.length);
          interpolatedName = nextName.slice(0, charsToAdd) || " ";
        }
      }

      const prevComment = prevNode.node.comment ?? "";
      const nextComment = nextNode.node.comment ?? "";
      let comment: string | undefined;
      let commentOpacity: number | undefined;
      if (prevComment === nextComment) {
        comment = prevComment || undefined;
      } else if (!prevComment && nextComment) {
        const chars = Math.floor(staggered * nextComment.length);
        comment = chars > 0 ? nextComment.slice(0, chars) : undefined;
      } else if (prevComment && !nextComment) {
        comment = prevComment;
        commentOpacity = 1 - staggered;
      } else {
        // Changed comment: typewriter only over the differing delta.
        comment = typewriterDelta(prevComment, nextComment, staggered);
      }

      const prevNote = prevNode.node.note ?? "";
      const nextNote = nextNode.node.note ?? "";
      let note: string | undefined;
      let noteOpacity: number | undefined;
      if (prevNote === nextNote) {
        note = prevNote || undefined;
      } else if (!prevNote && nextNote) {
        const chars = Math.floor(staggered * nextNote.length);
        note = chars > 0 ? nextNote.slice(0, chars) : undefined;
      } else if (prevNote && !nextNote) {
        note = prevNote;
        noteOpacity = 1 - staggered;
      } else {
        // Changed note: typewriter only over the differing delta.
        note = typewriterDelta(prevNote, nextNote, staggered);
      }

      // Display status (+/●/−): fade in/out across the transition instead of
      // snapping at the midpoint.
      const prevDs = prevNode.node.displayStatus;
      const nextDs = nextNode.node.displayStatus;
      let displayStatus: NodeDisplayStatus | undefined;
      let statusOpacity: number | undefined;
      if (prevDs === nextDs) {
        displayStatus = prevDs;
      } else if (!prevDs && nextDs) {
        displayStatus = nextDs;
        statusOpacity = staggered;
      } else if (prevDs && !nextDs) {
        displayStatus = prevDs;
        statusOpacity = 1 - staggered;
      } else {
        displayStatus = staggered >= 0.5 ? nextDs : prevDs;
      }

      // Package badge: fade when a PackageLink child appears/disappears.
      let hasPackage: boolean | undefined;
      let packageOpacity: number | undefined;
      if (prevNode.hasPackage === nextNode.hasPackage) {
        hasPackage = prevNode.hasPackage;
      } else if (!prevNode.hasPackage && nextNode.hasPackage) {
        hasPackage = true;
        packageOpacity = staggered;
      } else {
        hasPackage = true;
        packageOpacity = 1 - staggered;
      }

      result.push({
        id: rightId,
        name: interpolatedName,
        className: pick.className,
        props: pick.props,
        tags: pick.tags,
        attributes: pick.attributes,
        comment,
        commentOpacity,
        note,
        noteOpacity,
        displayStatus,
        statusOpacity,
        hasPackage,
        packageOpacity,
        noteLines: note ? note.split("\n").length : 0,
        x: lerp(prevNode.depth * INDENT + PADDING_LEFT, nextNode.depth * INDENT + PADDING_LEFT, staggered),
        y: lerp(prevNode.yRow * ROW_HEIGHT, nextNode.yRow * ROW_HEIGHT, staggered),
        opacity: 1,
        status: "present",
        icon: getClassIcon(pick.className),
      });
      processed.add(leftId);
      processed.add(rightId);
    }

    if (pair.status === "added") {
      const rightId = pair.rightNodeId!;
      const nextNode = nextMap.get(rightId);
      if (!nextNode) continue;

      const staggered = applyStagger(progress, nextNode.index, totalStagger, easingFn);

      const addedNote = nextNode.node.note;
      result.push({
        id: rightId,
        name: nextNode.node.name,
        className: nextNode.node.className,
        props: nextNode.node.props,
        tags: nextNode.node.tags,
        attributes: nextNode.node.attributes,
        comment: nextNode.node.comment,
        note: addedNote,
        displayStatus: nextNode.node.displayStatus,
        hasPackage: nextNode.hasPackage,
        noteLines: addedNote ? addedNote.split("\n").length : 0,
        x: nextNode.depth * INDENT + PADDING_LEFT,
        y: nextNode.yRow * ROW_HEIGHT,
        opacity: staggered,
        status: "entering",
        icon: getClassIcon(nextNode.node.className),
      });
      processed.add(rightId);
    }

    if (pair.status === "removed") {
      const leftId = pair.leftNodeId!;
      const prevNode = prevMap.get(leftId);
      if (!prevNode) continue;

      const staggered = applyStagger(progress, prevNode.index, totalStagger, easingFn);

      const removedNote = prevNode.node.note;
      result.push({
        id: leftId,
        name: prevNode.node.name,
        className: prevNode.node.className,
        props: prevNode.node.props,
        tags: prevNode.node.tags,
        attributes: prevNode.node.attributes,
        comment: prevNode.node.comment,
        note: removedNote,
        displayStatus: prevNode.node.displayStatus,
        hasPackage: prevNode.hasPackage,
        noteLines: removedNote ? removedNote.split("\n").length : 0,
        x: prevNode.depth * INDENT + PADDING_LEFT,
        y: prevNode.yRow * ROW_HEIGHT,
        opacity: 1 - staggered,
        status: "leaving",
        icon: getClassIcon(prevNode.node.className),
      });
      processed.add(leftId);
    }
  }

  // Sort by Y for proper rendering order
  result.sort((a, b) => a.y - b.y);
  return result;
}

function applyStagger(
  progress: number,
  nodeIndex: number,
  totalStagger: number,
  easingFn: (t: number) => number
): number {
  const delay = nodeIndex * STAGGER_DELAY;
  const scale = 1 - Math.min(totalStagger, 0.4);
  const adjusted = (progress - delay) / scale;
  return easingFn(Math.max(0, Math.min(1, adjusted)));
}

export function getAnimationHeight(nodes: InterpolatedNode[]): number {
  if (nodes.length === 0) return ROW_HEIGHT;
  return Math.max(...nodes.map(n => n.y)) + ROW_HEIGHT + 16;
}

// Estimated right edge of node content (icon + name + class + props + tags +
// comment). Used to place the right-side badge column. Generous per-char width
// so badges never overlap content; callers take the max across all keyframes so
// the column stays put during playback instead of jittering with the content.
const ICON_SLOT = 22;
const CHAR_W = 7.5;

export function getContentRight(nodes: InterpolatedNode[]): number {
  let max = 0;
  for (const n of nodes) {
    let chars = n.name?.length ?? 0;
    if (n.className) chars += n.className.length + 2;
    if (n.props) for (const k in n.props) chars += k.length + String(n.props[k]).length + 3;
    if (n.tags) for (const t of n.tags) chars += t.length + 2;
    if (n.comment) chars += n.comment.length + 3;
    const right = n.x + ICON_SLOT + chars * CHAR_W;
    if (right > max) max = right;
  }
  return max;
}
