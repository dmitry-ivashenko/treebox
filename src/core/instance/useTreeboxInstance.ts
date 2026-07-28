import { useState, useCallback, useRef, useId, useEffect } from "react";
import type {
  TreeboxDocument,
  TreeboxNode,
  TreeboxValue,
  ParseResult,
  NodeId,
  FormatSettings,
} from "../model/types";
import { DEFAULT_FORMAT_SETTINGS } from "../model/types";
import { parseTreeText } from "../parser/parseTreeText";
import { serializeTreeText } from "../serializer/serializeTreeText";
import { createNode, generateNodeId } from "../model/createNode";
import type { TreeboxInstance, DisplayMode, UseTreeboxInstanceOptions } from "./types";
import { subscribeDisplayMode } from "./displayModeBroadcast";

const MAX_UNDO = 100;

type UndoEntry = { doc: TreeboxDocument; textBuffer: string };

export function useTreeboxInstance(options: UseTreeboxInstanceOptions): TreeboxInstance {
  const autoId = useId();
  const instanceId = options.instanceId ?? autoId;
  const fmtSettings: FormatSettings = options.includeAllIds
    ? { ...DEFAULT_FORMAT_SETTINGS, includeAllIds: true }
    : DEFAULT_FORMAT_SETTINGS;

  const [doc, setDoc] = useState<TreeboxDocument>(options.initialDoc);
  const [textBuffer, setTextBuffer] = useState(options.initialText);
  const [parseResult, setParseResult] = useState<ParseResult>(
    () => parseTreeText(options.initialText, options.initialDoc.id)
  );
  const [dirty, setDirty] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    options.defaultDisplayMode ?? "split-v"
  );

  // Apply a Shift-click "set all panes" broadcast from any layout dropdown.
  // setDisplayMode is a stable state setter, so the subscription lives for the
  // instance's lifetime with no dependencies.
  useEffect(() => subscribeDisplayMode(setDisplayMode), []);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const docRef = useRef(doc);
  docRef.current = doc;
  const textRef = useRef(textBuffer);
  textRef.current = textBuffer;

  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);

  const pushUndo = useCallback(() => {
    undoStack.current.push({ doc: docRef.current, textBuffer: textRef.current });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const updateFromDoc = useCallback((newDoc: TreeboxDocument) => {
    const text = serializeTreeText(newDoc, fmtSettings);
    const result = parseTreeText(text, newDoc.id);
    setDoc(newDoc);
    setTextBuffer(text);
    setParseResult(result);
    setDirty(true);
  }, []);

  const setText = useCallback((text: string) => {
    if (text === textRef.current) return;
    const result = parseTreeText(text, docRef.current.id);
    setTextBuffer(text);
    setParseResult(result);
    setDirty(true);
    if (result.ok && result.document) {
      const newDoc = {
        ...result.document,
        id: docRef.current.id,
        createdAt: docRef.current.createdAt,
        updatedAt: new Date().toISOString(),
        viewState: docRef.current.viewState,
      };
      setDoc(newDoc);
    }
  }, []);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push({ doc: docRef.current, textBuffer: textRef.current });
    setDoc(entry.doc);
    setTextBuffer(entry.textBuffer);
    setParseResult(parseTreeText(entry.textBuffer, entry.doc.id));
    setDirty(true);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push({ doc: docRef.current, textBuffer: textRef.current });
    setDoc(entry.doc);
    setTextBuffer(entry.textBuffer);
    setParseResult(parseTreeText(entry.textBuffer, entry.doc.id));
    setDirty(true);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const applyExplorerAdd = useCallback((parentId: NodeId | null, name: string, className?: string) => {
    pushUndo();
    const d = docRef.current;
    const nodes = { ...d.nodes };
    const node = createNode({ name, className });
    nodes[node.id] = node;

    const newDoc = { ...d, nodes, updatedAt: new Date().toISOString() };
    if (parentId && nodes[parentId]) {
      const parent = { ...nodes[parentId] };
      parent.children = [...parent.children, node.id];
      nodes[parentId] = parent;
      newDoc.nodes = nodes;
    } else {
      newDoc.rootIds = [...d.rootIds, node.id];
    }
    updateFromDoc(newDoc);
  }, [pushUndo, updateFromDoc]);

  const applyExplorerDelete = useCallback((nodeId: NodeId) => {
    pushUndo();
    const d = docRef.current;
    const nodes = { ...d.nodes };

    const collectDescendants = (id: NodeId): NodeId[] => {
      const n = nodes[id];
      if (!n) return [id];
      return [id, ...n.children.flatMap(collectDescendants)];
    };
    const toRemove = new Set(collectDescendants(nodeId));
    for (const id of toRemove) delete nodes[id];

    for (const n of Object.values(nodes)) {
      if (n.children.includes(nodeId)) {
        nodes[n.id] = { ...n, children: n.children.filter((c) => c !== nodeId) };
      }
    }

    const newDoc = {
      ...d,
      nodes,
      rootIds: d.rootIds.filter((id) => !toRemove.has(id)),
      updatedAt: new Date().toISOString(),
    };
    updateFromDoc(newDoc);
  }, [pushUndo, updateFromDoc]);

  const applyExplorerRename = useCallback((nodeId: NodeId, name: string) => {
    pushUndo();
    const d = docRef.current;
    const nodes = { ...d.nodes };
    if (!nodes[nodeId]) return;
    nodes[nodeId] = { ...nodes[nodeId], name };
    updateFromDoc({ ...d, nodes, updatedAt: new Date().toISOString() });
  }, [pushUndo, updateFromDoc]);

  const applyExplorerMove = useCallback((nodeId: NodeId, newParentId: NodeId | null, newIndex: number) => {
    pushUndo();
    const d = docRef.current;
    const nodes = { ...d.nodes };
    let rootIds = [...d.rootIds];

    for (const n of Object.values(nodes)) {
      if (n.children.includes(nodeId)) {
        nodes[n.id] = { ...n, children: n.children.filter((c) => c !== nodeId) };
        break;
      }
    }
    rootIds = rootIds.filter((id) => id !== nodeId);

    if (newParentId && nodes[newParentId]) {
      const parent = { ...nodes[newParentId] };
      const children = [...parent.children];
      children.splice(newIndex, 0, nodeId);
      parent.children = children;
      nodes[newParentId] = parent;
    } else {
      rootIds.splice(newIndex, 0, nodeId);
    }

    updateFromDoc({ ...d, nodes, rootIds, updatedAt: new Date().toISOString() });
  }, [pushUndo, updateFromDoc]);

  const applyExplorerToggleCollapse = useCallback((nodeId: NodeId) => {
    const d = docRef.current;
    const nodes = { ...d.nodes };
    const node = nodes[nodeId];
    if (!node) return;
    nodes[nodeId] = { ...node, collapsed: !node.collapsed };
    setDoc({ ...d, nodes });
  }, []);

  const duplicateSubtree = useCallback((nodeId: NodeId) => {
    pushUndo();
    const d = docRef.current;
    const nodes = { ...d.nodes };
    const source = nodes[nodeId];
    if (!source) return;

    const idMap = new Map<string, string>();
    const collectIds = (id: NodeId) => {
      idMap.set(id, generateNodeId());
      const n = nodes[id];
      if (n) n.children.forEach(collectIds);
    };
    collectIds(nodeId);

    for (const [oldId, newId] of idMap) {
      const orig = nodes[oldId];
      nodes[newId] = {
        ...orig,
        id: newId,
        children: orig.children.map((c) => idMap.get(c) ?? c),
      };
    }

    const newRootId = idMap.get(nodeId)!;
    let parentId: NodeId | null = null;
    for (const [id, n] of Object.entries(nodes)) {
      if (n.children.includes(nodeId) && !idMap.has(id)) {
        parentId = id;
        break;
      }
    }

    const newDoc = { ...d, nodes, updatedAt: new Date().toISOString() };
    if (parentId) {
      const parent = { ...nodes[parentId] };
      const idx = parent.children.indexOf(nodeId);
      const children = [...parent.children];
      children.splice(idx + 1, 0, newRootId);
      parent.children = children;
      nodes[parentId] = parent;
      newDoc.nodes = nodes;
    } else {
      const idx = d.rootIds.indexOf(nodeId);
      const roots = [...d.rootIds];
      roots.splice(idx + 1, 0, newRootId);
      newDoc.rootIds = roots;
    }

    updateFromDoc(newDoc);
  }, [pushUndo, updateFromDoc]);

  const setSelectedNode = useCallback((nodeId: NodeId | undefined) => {
    setDoc(prev => ({ ...prev, viewState: { ...prev.viewState, selectedNodeId: nodeId } }));
  }, []);

  const collapseAll = useCallback(() => {
    const d = docRef.current;
    const nodes = { ...d.nodes };
    for (const id of Object.keys(nodes)) {
      if (nodes[id].children.length > 0) {
        nodes[id] = { ...nodes[id], collapsed: true };
      }
    }
    setDoc({ ...d, nodes });
  }, []);

  const expandAll = useCallback(() => {
    const d = docRef.current;
    const nodes = { ...d.nodes };
    for (const id of Object.keys(nodes)) {
      if (nodes[id].collapsed) {
        nodes[id] = { ...nodes[id], collapsed: false };
      }
    }
    setDoc({ ...d, nodes });
  }, []);

  const updateNode = useCallback((nodeId: NodeId, updates: { name?: string; className?: string; props?: Record<string, TreeboxValue>; displayStatus?: TreeboxNode["displayStatus"]; note?: string }) => {
    pushUndo();
    const d = docRef.current;
    const nodes = { ...d.nodes };
    const node = nodes[nodeId];
    if (!node) return;
    nodes[nodeId] = {
      ...node,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.className !== undefined ? { className: updates.className } : {}),
      ...(updates.props !== undefined ? { props: updates.props } : {}),
      ...("displayStatus" in updates ? { displayStatus: updates.displayStatus } : {}),
      ...("note" in updates ? { note: updates.note } : {}),
    };
    updateFromDoc({ ...d, nodes, updatedAt: new Date().toISOString() });
  }, [pushUndo, updateFromDoc]);

  const markClean = useCallback(() => {
    setDirty(false);
  }, []);

  const resetDocument = useCallback((newDoc: TreeboxDocument) => {
    const text = serializeTreeText(newDoc, fmtSettings);
    const result = parseTreeText(text, newDoc.id);
    setDoc(newDoc);
    setTextBuffer(text);
    setParseResult(result);
    setDirty(false);
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return {
    instanceId,
    doc,
    textBuffer,
    parseResult,
    dirty,
    displayMode,
    setDisplayMode,
    setText,
    applyExplorerAdd,
    applyExplorerDelete,
    applyExplorerRename,
    applyExplorerMove,
    applyExplorerToggleCollapse,
    duplicateSubtree,
    setSelectedNode,
    collapseAll,
    expandAll,
    updateNode,
    undo,
    redo,
    canUndo,
    canRedo,
    markClean,
    resetDocument,
  };
}
