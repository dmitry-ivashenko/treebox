import { useState, useCallback, type RefObject } from "react";
import { toPng } from "html-to-image";

const CAPTURE_PADDING = 16;

function getBackgroundColor(el: HTMLElement): string {
  return getComputedStyle(el).getPropertyValue("--bg-primary").trim() || "#1e1e2e";
}

async function captureElement(el: HTMLElement): Promise<string> {
  const bg = getBackgroundColor(el);
  const saved = {
    width: el.style.width,
    height: el.style.height,
    overflow: el.style.overflow,
    flex: el.style.flex,
    padding: el.style.padding,
  };
  el.classList.add("capturing");
  el.style.width = "fit-content";
  el.style.height = "fit-content";
  el.style.overflow = "visible";
  el.style.flex = "none";
  el.style.padding = `${CAPTURE_PADDING}px`;

  try {
    // Web fonts (Inter / JetBrains Mono) are loaded from Google Fonts. On a
    // fresh page load they may not be ready when the capture starts, and
    // html-to-image needs them fully loaded to embed them. Without this the
    // first export on prod often produces a blank/broken PNG.
    if (document.fonts?.ready) await document.fonts.ready;

    // Known html-to-image quirk: the first toPng() call frequently renders
    // before external resources (fonts/images) finish embedding, yielding an
    // empty image. A discarded warm-up pass populates its internal cache so
    // the second pass is complete. Cheap here since previews are small.
    const opts = { pixelRatio: 2, backgroundColor: bg, cacheBust: true };
    await toPng(el, opts);
    return await toPng(el, opts);
  } finally {
    el.classList.remove("capturing");
    el.style.width = saved.width;
    el.style.height = saved.height;
    el.style.overflow = saved.overflow;
    el.style.flex = saved.flex;
    el.style.padding = saved.padding;
  }
}

export function useImageCapture(ref: RefObject<HTMLElement | null>) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied">("idle");

  const copyImage = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    setStatus("copying");
    try {
      const dataUrl = await captureElement(el);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy image", err);
      setStatus("idle");
    }
  }, [ref]);

  const downloadImage = useCallback(async (filename = "preview.png") => {
    const el = ref.current;
    if (!el) return;
    try {
      const dataUrl = await captureElement(el);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error("Failed to download image", err);
    }
  }, [ref]);

  return { copyImage, downloadImage, status };
}
