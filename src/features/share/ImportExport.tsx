import { useTreeboxStore, selectActiveTab } from "../../app/store";
import type { ModeSlot, TabState, AnimateKeyframe, EasingType, TimelineLabel } from "../../core/tabs/types";
import { serializeTreeText } from "../../core/serializer/serializeTreeText";
import { DEFAULT_FORMAT_SETTINGS } from "../../core/model/types";
import { parseTreeText } from "../../core/parser/parseTreeText";
import { createDocument } from "../../core/model/createDocument";
import { generateNodeId } from "../../core/model/createNode";

export function useImportExport() {
  const activeTab = useTreeboxStore(selectActiveTab);
  const { updateEditState, updateDiffState, updateTimelineState, openTab, bumpImportGeneration } = useTreeboxStore();
  const mode = activeTab?.activeMode ?? "edit";

  const exportAsText = () => {
    if (!activeTab) return;
    if (mode === "edit") {
      const text = activeTab.edit.textBuffer || serializeTreeText(activeTab.edit.document);
      downloadFile(`${activeTab.title}.treebox.txt`, text, "text/plain");
    } else if (mode === "diff" && activeTab.diff) {
      const text = [
        "--- Before ---",
        serializeTreeText(activeTab.diff.left.document),
        "",
        "--- After ---",
        serializeTreeText(activeTab.diff.right.document),
      ].join("\n");
      downloadFile(`${activeTab.title}-diff.treebox.txt`, text, "text/plain");
    } else if (mode === "timeline" && activeTab.timeline) {
      const text = activeTab.timeline.steps.map((s, i) =>
        `--- Step ${i + 1}${s.label ? ` [label="${s.label}"]` : ""} ---\n${serializeTreeText(s.document)}`
      ).join("\n\n");
      downloadFile(`${activeTab.title}-timeline.treebox.txt`, text, "text/plain");
    } else if (mode === "animate" && activeTab.animate) {
      const anim = activeTab.animate;
      const header = `=== ANIMATION [duration=${anim.duration}, loop=${anim.loop}, speed=${anim.speed}] ===`;
      const keyframeTexts = anim.keyframes.map((kf, i) => {
        const attrs: string[] = [`time=${kf.time}`];
        if (kf.easing) attrs.push(`easing=${kf.easing}`);
        if (kf.label) attrs.push(`label="${kf.label}"`);
        return `--- Keyframe ${i + 1} [${attrs.join(", ")}] ---\n${serializeTreeText(kf.document, { ...DEFAULT_FORMAT_SETTINGS, includeAllIds: true })}`;
      });
      let animText = `${header}\n\n${keyframeTexts.join("\n\n")}`;
      if (anim.labels.length > 0) {
        animText += "\n\n--- Labels ---\n" + anim.labels.map(l => `[${l.startTime.toFixed(1)}s - ${l.endTime.toFixed(1)}s] "${l.text}"`).join("\n");
      }
      downloadFile(`${activeTab.title}-animation.treebox.txt`, animText, "text/plain");
    }
  };

  const exportAsJson = () => {
    if (!activeTab) return;
    if (mode === "edit") {
      const json = JSON.stringify(activeTab.edit.document, null, 2);
      downloadFile(`${activeTab.title}.treebox.json`, json, "application/json");
    } else if (mode === "diff" && activeTab.diff) {
      const json = JSON.stringify({
        mode: "diff",
        left: activeTab.diff.left.document,
        right: activeTab.diff.right.document,
      }, null, 2);
      downloadFile(`${activeTab.title}-diff.treebox.json`, json, "application/json");
    } else if (mode === "timeline" && activeTab.timeline) {
      const json = JSON.stringify({
        mode: "timeline",
        steps: activeTab.timeline.steps.map(s => ({ document: s.document, label: s.label })),
      }, null, 2);
      downloadFile(`${activeTab.title}-timeline.treebox.json`, json, "application/json");
    } else if (mode === "animate" && activeTab.animate) {
      const anim = activeTab.animate;
      const json = JSON.stringify({
        mode: "animate",
        duration: anim.duration,
        loop: anim.loop,
        speed: anim.speed,
        keyframes: anim.keyframes.map(kf => ({
          time: kf.time,
          easing: kf.easing,
          label: kf.label,
          document: kf.document,
        })),
        labels: anim.labels,
      }, null, 2);
      downloadFile(`${activeTab.title}-animation.treebox.json`, json, "application/json");
    }
  };

  const importFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".treebox.json,.treebox.txt,.json,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const content = await file.text();

      // Try JSON
      if (file.name.endsWith(".json")) {
        try {
          const data = JSON.parse(content);

          if (data.mode === "animate" && data.keyframes) {
            importAnimateJson(data);
            return;
          }
          if (data.mode === "diff" && data.left && data.right) {
            if (!activeTab) return;
            const left: ModeSlot = { document: data.left, textBuffer: serializeTreeText(data.left) };
            const right: ModeSlot = { document: data.right, textBuffer: serializeTreeText(data.right) };
            updateDiffState(activeTab.id, left, right);
            return;
          }
          if (data.mode === "timeline" && data.steps) {
            if (!activeTab) return;
            // Support both shapes: legacy (element is a bare document) and new
            // (element is { document, label }).
            const steps: ModeSlot[] = data.steps.map((d: any) => {
              const wrapped = d && d.document;
              const doc = wrapped ? d.document : d;
              return {
                document: doc,
                textBuffer: serializeTreeText(doc),
                label: wrapped ? d.label : undefined,
              };
            });
            updateTimelineState(activeTab.id, steps);
            return;
          }
          if (data.schemaVersion === 1 && data.nodes && data.rootIds) {
            if (!activeTab) return;
            const text = serializeTreeText(data);
            updateEditState(activeTab.id, { document: data, textBuffer: text });
            return;
          }
        } catch {
          // fall through
        }
      }

      // Try text: animation format
      if (content.trimStart().startsWith("=== ANIMATION")) {
        importAnimateText(content);
        return;
      }

      // Default: parse as tree text
      if (!activeTab) return;
      const result = parseTreeText(content);
      if (result.ok && result.document) {
        const text = serializeTreeText(result.document);
        updateEditState(activeTab.id, { document: result.document, textBuffer: text });
      }
    };
    input.click();
  };

  function importAnimateJson(data: any) {
    const keyframes: AnimateKeyframe[] = data.keyframes.map((kf: any) => ({
      id: generateNodeId(),
      time: kf.time ?? 0,
      easing: kf.easing as EasingType | undefined,
      label: kf.label,
      document: kf.document,
      textBuffer: serializeTreeText(kf.document, { ...DEFAULT_FORMAT_SETTINGS, includeAllIds: true }),
    }));
    const labels: TimelineLabel[] = (data.labels ?? []).map((l: any) => ({
      id: generateNodeId(),
      text: l.text ?? "Label",
      startTime: l.startTime ?? 0,
      endTime: l.endTime ?? 1,
    }));
    const doc = createDocument({ title: "Imported Animation" });
    const text = serializeTreeText(keyframes[0]?.document ?? doc);
    const tab: TabState = {
      id: doc.id,
      title: "Imported Animation",
      activeMode: "animate",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      edit: { document: keyframes[0]?.document ?? doc, textBuffer: text },
      diff: null,
      timeline: null,
      animate: {
        keyframes,
        labels,
        duration: data.duration ?? (keyframes.length * 2),
        loop: data.loop ?? true,
        speed: data.speed ?? 1,
      },
    };
    openTab(tab);
  }

  function importAnimateText(content: string) {
    const headerMatch = content.match(/=== ANIMATION \[([^\]]*)\] ===/);
    const headerAttrs = parseAttrs(headerMatch?.[1] ?? "");

    // Split labels section if present
    let mainContent = content;
    const labels: TimelineLabel[] = [];
    const labelsSplit = content.split(/--- Labels ---/);
    if (labelsSplit.length > 1) {
      mainContent = labelsSplit[0];
      const labelsText = labelsSplit[1].trim();
      const labelRe = /\[(\d+\.?\d*)s\s*-\s*(\d+\.?\d*)s\]\s*"([^"]*)"/g;
      let lm;
      while ((lm = labelRe.exec(labelsText)) !== null) {
        labels.push({ id: generateNodeId(), startTime: parseFloat(lm[1]), endTime: parseFloat(lm[2]), text: lm[3] });
      }
    }

    const kfBlocks = mainContent.split(/--- Keyframe \d+ \[([^\]]*)\] ---/);
    const keyframes: AnimateKeyframe[] = [];

    for (let i = 1; i < kfBlocks.length; i += 2) {
      const attrs = parseAttrs(kfBlocks[i]);
      const body = kfBlocks[i + 1]?.trim();
      if (!body) continue;
      const result = parseTreeText(body);
      if (!result.ok || !result.document) continue;
      keyframes.push({
        id: generateNodeId(),
        time: parseFloat(attrs.time ?? "0"),
        easing: (attrs.easing as EasingType) || undefined,
        label: attrs.label || undefined,
        document: result.document,
        textBuffer: serializeTreeText(result.document, { ...DEFAULT_FORMAT_SETTINGS, includeAllIds: true }),
      });
    }

    if (keyframes.length === 0) return;

    const doc = createDocument({ title: "Imported Animation" });
    const text = serializeTreeText(keyframes[0].document);
    const tab: TabState = {
      id: doc.id,
      title: "Imported Animation",
      activeMode: "animate",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      edit: { document: keyframes[0].document, textBuffer: text },
      diff: null,
      timeline: null,
      animate: {
        keyframes,
        labels,
        duration: parseFloat(headerAttrs.duration ?? String(keyframes.length * 2)),
        loop: headerAttrs.loop === "true",
        speed: parseFloat(headerAttrs.speed ?? "1"),
      },
    };
    openTab(tab);
  }

  const copyToClipboard = async (): Promise<boolean> => {
    if (!activeTab) return false;
    let text = "";
    if (mode === "edit") {
      text = activeTab.edit.textBuffer || serializeTreeText(activeTab.edit.document);
    } else if (mode === "diff" && activeTab.diff) {
      text = [
        "--- Before ---",
        serializeTreeText(activeTab.diff.left.document),
        "",
        "--- After ---",
        serializeTreeText(activeTab.diff.right.document),
      ].join("\n");
    } else if (mode === "timeline" && activeTab.timeline) {
      text = activeTab.timeline.steps.map((s, i) =>
        `--- Step ${i + 1}${s.label ? ` [label="${s.label}"]` : ""} ---\n${serializeTreeText(s.document)}`
      ).join("\n\n");
    } else if (mode === "animate" && activeTab.animate) {
      const anim = activeTab.animate;
      const header = `=== ANIMATION [duration=${anim.duration}, loop=${anim.loop}, speed=${anim.speed}] ===`;
      const keyframeTexts = anim.keyframes.map((kf, i) => {
        const attrs: string[] = [`time=${kf.time}`];
        if (kf.easing) attrs.push(`easing=${kf.easing}`);
        if (kf.label) attrs.push(`label="${kf.label}"`);
        return `--- Keyframe ${i + 1} [${attrs.join(", ")}] ---\n${serializeTreeText(kf.document, { ...DEFAULT_FORMAT_SETTINGS, includeAllIds: true })}`;
      });
      text = `${header}\n\n${keyframeTexts.join("\n\n")}`;
      if (anim.labels.length > 0) {
        text += "\n\n--- Labels ---\n" + anim.labels.map(l => `[${l.startTime.toFixed(1)}s - ${l.endTime.toFixed(1)}s] "${l.text}"`).join("\n");
      }
    }
    if (!text) return false;
    await navigator.clipboard.writeText(text);
    return true;
  };

  const importFromClipboard = async (): Promise<string | null> => {
    try {
      const content = await navigator.clipboard.readText();
      if (!content.trim()) return "Clipboard is empty";

      // Try JSON
      try {
        const data = JSON.parse(content);

        if (data.mode === "animate" && data.keyframes) {
          importAnimateJson(data);
          return null;
        }
        if (data.mode === "diff" && data.left && data.right) {
          if (!activeTab) return "No active tab";
          const left: ModeSlot = { document: data.left, textBuffer: serializeTreeText(data.left) };
          const right: ModeSlot = { document: data.right, textBuffer: serializeTreeText(data.right) };
          updateDiffState(activeTab.id, left, right);
          useTreeboxStore.getState().setMode("diff");
          bumpImportGeneration();
          return null;
        }
        if (data.mode === "timeline" && data.steps) {
          if (!activeTab) return "No active tab";
          const steps: ModeSlot[] = data.steps.map((d: any) => ({
            document: d,
            textBuffer: serializeTreeText(d),
          }));
          updateTimelineState(activeTab.id, steps);
          useTreeboxStore.getState().setMode("timeline");
          bumpImportGeneration();
          return null;
        }
        if (data.schemaVersion === 1 && data.nodes && data.rootIds) {
          if (!activeTab) return "No active tab";
          const text = serializeTreeText(data);
          updateEditState(activeTab.id, { document: data, textBuffer: text });
          useTreeboxStore.getState().setMode("edit");
          bumpImportGeneration();
          return null;
        }
      } catch {
        // Not JSON, try text formats
      }

      // Try text: animation format
      if (content.trimStart().startsWith("=== ANIMATION")) {
        importAnimateText(content);
        return null;
      }

      // Try text: diff format
      if (content.includes("--- Before ---") && content.includes("--- After ---")) {
        if (!activeTab) return "No active tab";
        const parts = content.split(/--- (?:Before|After) ---/);
        const leftText = parts[1]?.trim();
        const rightText = parts[2]?.trim();
        if (leftText && rightText) {
          const leftResult = parseTreeText(leftText);
          const rightResult = parseTreeText(rightText);
          if (leftResult.ok && leftResult.document && rightResult.ok && rightResult.document) {
            const left: ModeSlot = { document: leftResult.document, textBuffer: serializeTreeText(leftResult.document) };
            const right: ModeSlot = { document: rightResult.document, textBuffer: serializeTreeText(rightResult.document) };
            updateDiffState(activeTab.id, left, right);
            useTreeboxStore.getState().setMode("diff");
            bumpImportGeneration();
            return null;
          }
        }
      }

      // Try text: timeline format. Dividers are `--- Step N ---` with an
      // optional `[label="..."]` (splitting on the capture group interleaves the
      // captured label between bodies, so we step by 2).
      if (/--- Step \d+(?: \[[^\]]*\])? ---/.test(content)) {
        if (!activeTab) return "No active tab";
        const blocks = content.split(/--- Step \d+(?: \[([^\]]*)\])? ---/);
        const steps: ModeSlot[] = [];
        for (let i = 1; i < blocks.length; i += 2) {
          const attrRaw = blocks[i];
          const body = blocks[i + 1]?.trim();
          if (!body) continue;
          const result = parseTreeText(body);
          if (result.ok && result.document) {
            const label = attrRaw ? (parseAttrs(attrRaw).label || undefined) : undefined;
            steps.push({ document: result.document, textBuffer: serializeTreeText(result.document), label });
          }
        }
        if (steps.length >= 2) {
          updateTimelineState(activeTab.id, steps);
          useTreeboxStore.getState().setMode("timeline");
          bumpImportGeneration();
          return null;
        }
      }

      // Default: parse as single tree
      if (!activeTab) return "No active tab";
      const result = parseTreeText(content);
      if (result.ok && result.document) {
        const text = serializeTreeText(result.document);
        updateEditState(activeTab.id, { document: result.document, textBuffer: text });
        useTreeboxStore.getState().setMode("edit");
        bumpImportGeneration();
        return null;
      }

      return "Could not parse clipboard content";
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        return "Clipboard access denied. Please allow clipboard permissions.";
      }
      return "Failed to read clipboard";
    }
  };

  return { exportAsText, exportAsJson, importFile, importFromClipboard, copyToClipboard };
}

function parseAttrs(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /(\w+)\s*=\s*(?:"([^"]*)"|([^,\s]*))/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    result[m[1]] = m[2] ?? m[3];
  }
  return result;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
