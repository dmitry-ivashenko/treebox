import { useEffect, useState } from "react";
import { useTreeboxStore } from "./store";
import type { TabState, WorkMode } from "../core/tabs/types";
import { DEFAULT_FORMAT_SETTINGS } from "../core/model/types";
import { decodeSharePayloadFull } from "../core/share/decodeSharePayload";
import { serializeTreeText } from "../core/serializer/serializeTreeText";
import { generateNodeId } from "../core/model/createNode";

export function useUrlShare() {
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#\/?/, ""));
    const payload = params.get("d");
    if (!payload) return;

    const result = decodeSharePayloadFull(payload);
    if (!result) {
      setUrlError(payload.slice(0, 200));
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const validModes: WorkMode[] = ["edit", "diff", "timeline", "animate"];

    if (result.kind === "animate") {
      const primaryDoc = result.keyframes[0].document;
      const text = serializeTreeText(primaryDoc);
      const tabId = generateNodeId();
      const tab: TabState = {
        id: tabId,
        title: primaryDoc.title,
        activeMode: "animate",
        createdAt: primaryDoc.createdAt,
        updatedAt: primaryDoc.updatedAt,
        edit: { document: primaryDoc, textBuffer: text },
        diff: null,
        timeline: null,
        animate: {
          keyframes: result.keyframes.map((kf, i) => ({
            id: `kf_${i}`,
            time: kf.time,
            easing: kf.easing as any,
            label: kf.label,
            document: kf.document,
            textBuffer: serializeTreeText(kf.document, { ...DEFAULT_FORMAT_SETTINGS, includeAllIds: true }),
          })),
          labels: result.labels.map((l, i) => ({ id: `lbl_${i}`, ...l })),
          duration: result.duration,
          loop: result.loop,
          speed: result.speed,
        },
      };
      const store = useTreeboxStore.getState();
      store.openTab(tab);
      store.setPreviewFullscreen(true);
      useTreeboxStore.setState({ autoplay: true });
    } else if (result.kind === "multi") {
      const mode = validModes.includes(result.mode as WorkMode) ? (result.mode as WorkMode) : "diff";
      const primaryDoc = result.docs[0];
      const text = serializeTreeText(primaryDoc);
      const tabId = generateNodeId();

      const tab: TabState = {
        id: tabId,
        title: primaryDoc.title,
        activeMode: mode,
        createdAt: primaryDoc.createdAt,
        updatedAt: primaryDoc.updatedAt,
        edit: { document: primaryDoc, textBuffer: text },
        diff: mode === "diff" && result.docs.length >= 2 ? {
          left: { document: result.docs[0], textBuffer: serializeTreeText(result.docs[0]) },
          right: { document: result.docs[1], textBuffer: serializeTreeText(result.docs[1]) },
        } : null,
        timeline: mode === "timeline" || mode === "animate" ? {
          steps: result.docs.map((d, i) => ({ document: d, textBuffer: serializeTreeText(d), label: result.labels?.[i] })),
        } : null,
        animate: mode === "animate" ? {
          keyframes: result.docs.map((d, i) => ({
            id: `kf_${i}`,
            time: i * 2,
            document: d,
            textBuffer: serializeTreeText(d),
          })),
          labels: [],
          duration: result.docs.length * 2,
          loop: true,
          speed: 1,
        } : null,
      };
      const store = useTreeboxStore.getState();
      store.openTab(tab);
      if (mode !== "edit") store.setPreviewFullscreen(true);
      if (mode === "animate") useTreeboxStore.setState({ autoplay: true });
    } else {
      const modeParam = params.get("m");
      const mode = modeParam && validModes.includes(modeParam as WorkMode) ? (modeParam as WorkMode) : "edit";
      const doc = result.doc;
      const text = serializeTreeText(doc);
      const tabId = generateNodeId();

      const tab: TabState = {
        id: tabId,
        title: doc.title,
        activeMode: mode,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        edit: { document: doc, textBuffer: text },
        diff: mode === "diff" ? {
          left: { document: structuredClone(doc), textBuffer: text },
          right: { document: structuredClone(doc), textBuffer: text },
        } : null,
        timeline: mode === "timeline" ? {
          steps: [
            { document: structuredClone(doc), textBuffer: text },
            { document: structuredClone(doc), textBuffer: text },
          ],
        } : null,
        animate: null,
      };
      const store = useTreeboxStore.getState();
      store.openTab(tab);
      if (mode !== "edit") store.setPreviewFullscreen(true);
      if (mode === "animate") useTreeboxStore.setState({ autoplay: true });
    }

    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return { urlError, dismissUrlError: () => setUrlError(null) };
}
