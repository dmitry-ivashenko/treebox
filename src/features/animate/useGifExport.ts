import { useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { toCanvas, getFontEmbedCSS } from "html-to-image";

export type GifExportStatus = "idle" | "recording" | "encoding" | "done";

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export function useGifExport() {
  const [status, setStatus] = useState<GifExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  const exportGif = useCallback(async (
    duration: number,
    captureEl: HTMLElement | null,
    setPlayhead: (t: number) => void,
    options?: { fps?: number }
  ) => {
    if (!captureEl) return;

    abortRef.current = false;
    setStatus("recording");
    setProgress(0);

    const fps = options?.fps ?? 12;
    const frameCount = Math.ceil(duration * fps);
    const frames: Blob[] = [];
    const PIXEL_RATIO = 2;
    const CONTENT_PAD = 24; // breathing room to the right of the widest node
    // Widest content right-edge (CSS px, relative to captureEl) seen across frames.
    let maxContentRight = 0;

    const measureContentRight = () => {
      const base = captureEl.getBoundingClientRect().left;
      let right = 0;
      captureEl
        .querySelectorAll(".animate-node, .animate-note-line, .animate-label-badge, .animate-node-badges")
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0) right = Math.max(right, r.right - base);
        });
      if (right > maxContentRight) maxContentRight = right;
    };

    // Snapshot styles we mutate so a single restore() puts everything back, even
    // on error. Killing transitions/animations during capture makes each frame
    // show the exact JS-interpolated state rather than a value still easing
    // toward it — the badge opacity transitions are 0.05s, which is why the old
    // code blindly waited 50ms per frame.
    const prevFlex = captureEl.style.flex;
    const prevHeight = captureEl.style.height;
    const prevOverflow = captureEl.style.overflow;
    const noTransition = document.createElement("style");
    noTransition.textContent =
      ".gif-capturing, .gif-capturing * { transition: none !important; animation: none !important; }";
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      captureEl.style.flex = prevFlex;
      captureEl.style.height = prevHeight;
      captureEl.style.overflow = prevOverflow;
      captureEl.classList.remove("gif-capturing");
      noTransition.remove();
    };

    try {
      const bg = getComputedStyle(captureEl).getPropertyValue("--bg-primary").trim() || "#1e1e2e";

      // Make the capture zone shrink-to-content and freeze its animations.
      captureEl.style.flex = "none";
      captureEl.style.height = "auto";
      captureEl.style.overflow = "visible";
      captureEl.classList.add("gif-capturing");
      document.head.appendChild(noTransition);

      // Embed web fonts ONCE up front. Passing the cached CSS to every capture
      // stops html-to-image from re-fetching and re-encoding @font-face on each
      // frame — the dominant per-frame cost when fonts aren't cached.
      let fontEmbedCSS = "";
      try {
        fontEmbedCSS = await getFontEmbedCSS(captureEl);
      } catch {
        // Fall back to per-call embedding if this fails.
      }

      for (let i = 0; i <= frameCount; i++) {
        if (abortRef.current) { restore(); setStatus("idle"); return; }

        const time = (i / frameCount) * duration;
        // Commit the playhead synchronously so the DOM is on this exact frame
        // before we serialize it; one rAF lets the browser flush style/layout.
        flushSync(() => setPlayhead(time));
        setProgress(i / (frameCount + 1));
        await nextFrame();

        measureContentRight();

        const canvas = await toCanvas(captureEl, {
          pixelRatio: PIXEL_RATIO,
          backgroundColor: bg,
          fontEmbedCSS,
        });
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
        if (blob) frames.push(blob);
      }

      // Capture done — unfreeze the UI before the heavy encode work.
      restore();

      if (abortRef.current) { setStatus("idle"); return; }

      setStatus("encoding");
      setProgress(0);

      // Yield to let UI update before heavy work
      await new Promise(resolve => setTimeout(resolve, 100));

      const { encode } = await import("modern-gif");

      // Crop width to the widest content seen, dropping the empty right margin.
      // Content is left-aligned, so cropping from the right keeps the whole tree.
      let cropWidth = 0; // 0 = no crop (set once below, once img size is known)
      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d")!;

      const frameImages: ImageData[] = [];
      for (let i = 0; i < frames.length; i++) {
        if (abortRef.current) { setStatus("idle"); return; }
        // createImageBitmap decodes faster (and off the main thread) than the
        // Image() + onload round trip the old code used.
        const bmp = await createImageBitmap(frames[i]);
        if (cropWidth === 0) {
          cropWidth = maxContentRight > 0
            ? Math.min(bmp.width, Math.round((maxContentRight + CONTENT_PAD) * PIXEL_RATIO))
            : bmp.width;
        }
        cropCanvas.width = cropWidth;
        cropCanvas.height = bmp.height;
        cropCtx.drawImage(bmp, 0, 0);
        frameImages.push(cropCtx.getImageData(0, 0, cropWidth, bmp.height));
        bmp.close();
        setProgress((i + 1) / frames.length);
        // Yield periodically to keep UI responsive
        if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (frameImages.length === 0 || abortRef.current) { setStatus("idle"); return; }

      const width = frameImages[0].width;
      const height = frameImages[0].height;

      const gif = await encode({
        width,
        height,
        frames: frameImages.map(imgData => ({
          data: imgData.data,
          delay: Math.round(1000 / fps),
        })),
      });

      const blob = new Blob([gif], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "treebox-animation.gif";
      a.click();
      URL.revokeObjectURL(url);

      setStatus("done");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      console.error("GIF export failed:", err);
      setStatus("idle");
    } finally {
      restore();
    }
  }, []);

  return { exportGif, cancel, status, progress };
}
