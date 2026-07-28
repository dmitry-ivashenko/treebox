import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useTreeboxStore } from "../../app/store";
import { useTreeboxInstance } from "../../core/instance/useTreeboxInstance";
import { useGlobalUndo } from "../../app/useGlobalUndo";
import { ActiveInstanceProvider } from "../../core/instance/ActiveInstanceContext";
import { TreeboxPane } from "../treebox/TreeboxPane";
import { AnimatedPreview } from "./AnimatedPreview";
import { PlayerControls } from "./PlayerControls";
import { TimelineStrip } from "./TimelineStrip";
import { usePlayback, currentKeyframeIndex } from "./usePlayback";
import { useGifExport } from "./useGifExport";
import { useAnimateHistory } from "./useAnimateHistory";
import { interpolateAt, getAnimationHeight, getContentRight } from "../../core/animate/interpolate";
import { generateNodeId } from "../../core/model/createNode";
import { nanoid } from "nanoid";
import type { AnimateModeState, AnimateKeyframe, EasingType, TimelineLabel } from "../../core/tabs/types";

type Props = { tabId: string };

export function AnimatePage({ tabId }: Props) {
  const initAnimateIfNeeded = useTreeboxStore(s => s.initAnimateIfNeeded);
  const updateAnimateState = useTreeboxStore(s => s.updateAnimateState);
  const previewFullscreen = useTreeboxStore(s => s.previewFullscreen);
  const setPreviewFullscreen = useTreeboxStore(s => s.setPreviewFullscreen);
  const tab = useTreeboxStore(s => s.tabs.find(t => t.id === tabId));

  useEffect(() => { initAnimateIfNeeded(tabId); }, [tabId, initAnimateIfNeeded]);

  const animState = tab?.animate;
  if (!animState) return null;

  return <AnimatePageInner tabId={tabId} animState={animState} updateAnimateState={updateAnimateState} previewFullscreen={previewFullscreen} setPreviewFullscreen={setPreviewFullscreen} />;
}

function AnimatePageInner({
  tabId, animState, updateAnimateState, previewFullscreen, setPreviewFullscreen,
}: {
  tabId: string;
  animState: AnimateModeState;
  updateAnimateState: (tabId: string, state: AnimateModeState) => void;
  previewFullscreen: boolean;
  setPreviewFullscreen: (fs: boolean) => void;
}) {
  const autoplay = useTreeboxStore(s => s.autoplay);
  const playback = usePlayback(animState);
  const { exportGif, cancel: cancelGif, status: gifStatus, progress: gifProgress } = useGifExport();
  const [selectedKfId, setSelectedKfId] = useState<string | null>(null);
  const [editorDisplayMode, setEditorDisplayMode] = useState<string>("split-h");
  const previewRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const gifExportRequested = useTreeboxStore(s => s.gifExportRequested);

  // Snapshot-based undo/redo for structural timeline ops (keyframes, labels,
  // duration, loop, speed). Editor content edits stay on raw updateAnimateState
  // (already undoable via CodeMirror) and must NOT go through commit().
  const applyAnimateState = useCallback(
    (next: AnimateModeState) => updateAnimateState(tabId, next),
    [tabId, updateAnimateState]
  );
  const history = useAnimateHistory(animState, applyAnimateState);
  const { commit } = history;

  useEffect(() => {
    if (autoplay) {
      playback.play();
      useTreeboxStore.setState({ autoplay: false });
    }
  }, []);

  useEffect(() => {
    if (gifExportRequested) {
      useTreeboxStore.setState({ gifExportRequested: false });
      playback.pause();
      exportGif(animState.duration, captureRef.current, playback.setPlayhead);
    }
  }, [gifExportRequested]);

  const kfIndex = currentKeyframeIndex(animState.keyframes, playback.playhead);
  const currentKf = animState.keyframes[kfIndex];

  const [editorKfId, setEditorKfId] = useState(currentKf?.id);

  useEffect(() => {
    if (!playback.playing && currentKf) {
      // Keep both the editor and the timeline selection pinned to the keyframe
      // just left of the playhead — the one whose content is on screen. Scrubbing
      // the red line therefore re-selects that keyframe, so it's editable on release.
      if (currentKf.id !== editorKfId) setEditorKfId(currentKf.id);
      if (currentKf.id !== selectedKfId) setSelectedKfId(currentKf.id);
    }
  }, [currentKf?.id, playback.playing]);

  // Drop a dangling selection if its keyframe no longer exists (e.g. after a
  // redo of a delete, where currentKf?.id may not have changed).
  useEffect(() => {
    if (selectedKfId && !animState.keyframes.some(kf => kf.id === selectedKfId)) {
      setSelectedKfId(null);
    }
  }, [animState.keyframes, selectedKfId]);

  const handleEditorChange = useCallback((doc: any, textBuffer: string) => {
    if (!currentKf) return;
    // Edits always apply to the current keyframe. New keyframes are created
    // explicitly via the "+ Keyframe" / "Duplicate" buttons in the timeline.
    updateAnimateState(tabId, {
      ...animState,
      keyframes: animState.keyframes.map(kf =>
        kf.id === currentKf.id ? { ...kf, document: doc, textBuffer } : kf
      ),
    });
  }, [animState, currentKf, tabId, updateAnimateState]);

  const interpolatedNodes = useMemo(
    () => interpolateAt(animState.keyframes, playback.playhead),
    [animState.keyframes, playback.playhead]
  );

  const maxHeight = useMemo(() => {
    let max = 0;
    for (const kf of animState.keyframes) {
      const nodes = interpolateAt([kf], 0);
      const h = getAnimationHeight(nodes);
      if (h > max) max = h;
    }
    return max;
  }, [animState.keyframes]);

  // Fixed x for the right-side badge column (status markers + package icon),
  // computed across ALL keyframes so it stays put during playback (no jitter).
  const badgeColumnX = useMemo(() => {
    let max = 0;
    for (const kf of animState.keyframes) {
      const right = getContentRight(interpolateAt([kf], 0));
      if (right > max) max = right;
    }
    return max + 14; // gap between content and badges
  }, [animState.keyframes]);

  const LABEL_FADE = 0.3;
  const activeLabel = useMemo(() => {
    const lbl = animState.labels.find(l => playback.playhead >= l.startTime && playback.playhead <= l.endTime);
    if (!lbl) return undefined;
    const fadeIn = Math.min(1, (playback.playhead - lbl.startTime) / LABEL_FADE);
    const fadeOut = Math.min(1, (lbl.endTime - playback.playhead) / LABEL_FADE);
    return { text: lbl.text, opacity: Math.min(fadeIn, fadeOut) };
  }, [animState.labels, playback.playhead]);

  const handleKeyframeDrag = useCallback((kfId: string, newTime: number) => {
    commit({
      ...animState,
      keyframes: animState.keyframes.map(kf =>
        kf.id === kfId ? { ...kf, time: newTime } : kf
      ).sort((a, b) => a.time - b.time),
    });
  }, [animState, tabId, commit]);

  const handleKeyframeDelete = useCallback((kfId: string) => {
    if (animState.keyframes.length <= 1) return;
    const sorted = [...animState.keyframes].sort((a, b) => a.time - b.time);
    if (sorted[0]?.id === kfId) return;
    const remaining = animState.keyframes.filter(kf => kf.id !== kfId);
    commit({ ...animState, keyframes: remaining });
    setSelectedKfId(null);
    // Move playhead to nearest remaining keyframe
    const nearest = remaining.reduce((best, kf) =>
      Math.abs(kf.time - playback.playhead) < Math.abs(best.time - playback.playhead) ? kf : best
    );
    playback.setPlayhead(nearest.time);
  }, [animState, tabId, commit, playback]);

  const handleKeyframeCreate = useCallback(() => {
    const sorted = [...animState.keyframes].sort((a, b) => a.time - b.time);
    // Source = the keyframe at/just before the playhead (the "previous" one).
    const srcIndex = currentKeyframeIndex(sorted, playback.playhead);
    const source = sorted[srcIndex];
    if (!source) return;

    const isOnKf = sorted.some(kf => Math.abs(kf.time - playback.playhead) < 0.05);
    let time: number;
    if (!isOnKf) {
      time = playback.playhead;
    } else {
      // Playhead sits on a keyframe — drop the copy halfway to the next one (or +1s).
      const next = sorted.find(kf => kf.time > playback.playhead + 0.05);
      time = next ? (playback.playhead + next.time) / 2 : playback.playhead + 1;
    }

    const newKf: AnimateKeyframe = {
      id: generateNodeId(),
      time,
      document: { ...structuredClone(source.document), id: nanoid(10) },
      textBuffer: source.textBuffer,
      easing: source.easing,
    };
    const keyframes = [...animState.keyframes, newKf].sort((a, b) => a.time - b.time);
    const duration = Math.max(animState.duration, newKf.time + 2);
    commit({ ...animState, keyframes, duration });
    setEditorKfId(newKf.id);
    setSelectedKfId(newKf.id);
    playback.setPlayhead(time);
  }, [animState, playback, tabId, commit]);

  const handleKeyframeDuplicate = useCallback(() => {
    const sorted = [...animState.keyframes].sort((a, b) => a.time - b.time);
    const source = animState.keyframes.find(kf => kf.id === selectedKfId) ?? sorted[currentKeyframeIndex(sorted, playback.playhead)];
    if (!source) return;

    const next = sorted.find(kf => kf.time > source.time + 0.05);
    const gap = next ? Math.min(1, (next.time - source.time) / 2) : 1;
    const time = source.time + gap;

    const newKf: AnimateKeyframe = {
      id: generateNodeId(),
      time,
      document: { ...structuredClone(source.document), id: nanoid(10) },
      textBuffer: source.textBuffer,
      easing: source.easing,
      label: source.label,
    };
    const keyframes = [...animState.keyframes, newKf].sort((a, b) => a.time - b.time);
    const duration = Math.max(animState.duration, newKf.time + 2);
    commit({ ...animState, keyframes, duration });
    setEditorKfId(newKf.id);
    setSelectedKfId(newKf.id);
    playback.setPlayhead(time);
  }, [animState, selectedKfId, playback, tabId, commit]);

  const handleDurationChange = useCallback((newDuration: number) => {
    const labels = animState.labels
      .map(l => ({ ...l, endTime: Math.min(l.endTime, newDuration) }))
      .filter(l => l.startTime < newDuration);
    commit({ ...animState, duration: newDuration, labels });
  }, [animState, tabId, commit]);

  const handleLoopChange = useCallback((loop: boolean) => {
    commit({ ...animState, loop });
  }, [animState, tabId, commit]);

  const handleSpeedChange = useCallback((speed: number) => {
    commit({ ...animState, speed });
  }, [animState, tabId, commit]);



  const handleKeyframeEasingChange = useCallback((kfId: string, easing: EasingType) => {
    commit({
      ...animState,
      keyframes: animState.keyframes.map(kf => kf.id === kfId ? { ...kf, easing } : kf),
    });
  }, [animState, tabId, commit]);

  const handleKeyframeLabelChange = useCallback((kfId: string, label: string) => {
    commit({
      ...animState,
      keyframes: animState.keyframes.map(kf => kf.id === kfId ? { ...kf, label: label || undefined } : kf),
    });
  }, [animState, tabId, commit]);

  const handleLabelAdd = useCallback((startTime: number, endTime: number) => {
    const newLabel: TimelineLabel = { id: generateNodeId(), text: "Label", startTime, endTime };
    commit({
      ...animState,
      labels: [...animState.labels, newLabel].sort((a, b) => a.startTime - b.startTime),
    });
  }, [animState, tabId, commit]);

  const handleLabelMove = useCallback((labelId: string, newStartTime: number) => {
    const label = animState.labels.find(l => l.id === labelId);
    if (!label) return;
    const dur = label.endTime - label.startTime;
    commit({
      ...animState,
      labels: animState.labels.map(l =>
        l.id === labelId ? { ...l, startTime: newStartTime, endTime: newStartTime + dur } : l
      ).sort((a, b) => a.startTime - b.startTime),
    });
  }, [animState, tabId, commit]);

  const handleLabelResize = useCallback((labelId: string, newStart: number, newEnd: number) => {
    commit({
      ...animState,
      labels: animState.labels.map(l =>
        l.id === labelId ? { ...l, startTime: newStart, endTime: newEnd } : l
      ).sort((a, b) => a.startTime - b.startTime),
    });
  }, [animState, tabId, commit]);

  const handleLabelDelete = useCallback((labelId: string) => {
    commit({
      ...animState,
      labels: animState.labels.filter(l => l.id !== labelId),
    });
  }, [animState, tabId, commit]);

  const handleLabelTextChange = useCallback((labelId: string, text: string) => {
    commit({
      ...animState,
      labels: animState.labels.map(l => l.id === labelId ? { ...l, text } : l),
    });
  }, [animState, tabId, commit]);



  const selectedKf = animState.keyframes.find(kf => kf.id === selectedKfId);

  if (previewFullscreen) {
    return (
      <FullscreenAnimate
        previewRef={previewRef}
        interpolatedNodes={interpolatedNodes}
        activeLabel={activeLabel}
        maxHeight={maxHeight}
        badgeColumnX={badgeColumnX}
        playback={playback}
        animState={animState}
        onLoopChange={handleLoopChange}
        onSpeedChange={handleSpeedChange}
        onExit={() => setPreviewFullscreen(false)}
      />
    );
  }

  return (
    <div className="animate-layout">
      <div className="animate-top">
        <div className="animate-editor-pane">
          {currentKf && (
            <KeyframeEditor
              key={editorKfId}
              keyframe={currentKf}
              label={`Keyframe ${kfIndex + 1}`}
              tabId={tabId}
              onChange={handleEditorChange}
              displayMode={editorDisplayMode}
              onDisplayModeChange={setEditorDisplayMode}
              onUndo={history.undo}
              onRedo={history.redo}
            />
          )}
        </div>
        <div className="animate-preview-pane" ref={previewRef}>
          <div ref={captureRef} className="animate-capture-zone">
            <AnimatedPreview nodes={interpolatedNodes} activeLabel={activeLabel} fixedHeight={maxHeight} badgeColumnX={badgeColumnX} />
          </div>
          <PlayerControls
            playing={playback.playing}
            playhead={playback.playhead}
            duration={animState.duration}
            loop={animState.loop}
            speed={animState.speed}
            onToggle={playback.toggle}
            onStepBackward={playback.stepBackward}
            onStepForward={playback.stepForward}
            onSeekToStart={playback.seekToStart}
            onSeekToEnd={playback.seekToEnd}
            onSeek={playback.setPlayhead}
            onLoopChange={handleLoopChange}
            onSpeedChange={handleSpeedChange}
            onFullscreen={() => setPreviewFullscreen(true)}
          />
        </div>
      </div>
      <div className="animate-strip-zone">
        <TimelineStrip
          keyframes={animState.keyframes}
          duration={animState.duration}
          playhead={playback.playhead}
          onSeek={t => { playback.pause(); playback.setPlayhead(t); }}
          onKeyframeDrag={handleKeyframeDrag}
          onKeyframeSelect={id => { playback.pause(); setSelectedKfId(id); const kf = animState.keyframes.find(k => k.id === id); if (kf) playback.setPlayhead(kf.time); }}
          onKeyframeDelete={handleKeyframeDelete}
          onKeyframeCreate={handleKeyframeCreate}
          onKeyframeDuplicate={handleKeyframeDuplicate}
          onDurationChange={handleDurationChange}
          selectedKeyframeId={selectedKfId ?? undefined}
          selectedKf={selectedKf}
          onEasingChange={handleKeyframeEasingChange}
          onLabelChange={handleKeyframeLabelChange}
          labels={animState.labels}
          onLabelAdd={handleLabelAdd}
          onLabelMove={handleLabelMove}
          onLabelResize={handleLabelResize}
          onLabelDelete={handleLabelDelete}
          onLabelTextChange={handleLabelTextChange}
        />
      </div>
      {gifStatus !== "idle" && (
        <div className="gif-export-overlay">
          <div className="gif-export-modal">
            <div className="gif-export-spinner" />
            <div className="gif-export-text">
              {gifStatus === "recording" && `Recording frames... ${Math.round(gifProgress * 100)}%`}
              {gifStatus === "encoding" && `Creating GIF... ${Math.round(gifProgress * 100)}%`}
              {gifStatus === "done" && "Done!"}
            </div>
            {(gifStatus === "recording" || gifStatus === "encoding") && (
              <button className="btn btn-sm" onClick={cancelGif}>Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FullscreenAnimate({
  previewRef, interpolatedNodes, activeLabel, maxHeight, badgeColumnX,
  playback, animState, onLoopChange, onSpeedChange, onExit,
}: {
  previewRef: React.RefObject<HTMLDivElement>;
  interpolatedNodes: any[];
  activeLabel?: { text: string; opacity: number };
  maxHeight: number;
  badgeColumnX: number;
  playback: any;
  animState: AnimateModeState;
  onLoopChange: (loop: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onExit: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cinematic loop phases (fullscreen only): gently fade the tree in before the
  // animation, fade it out after, then hold a short empty gap before repeating.
  const INTRO = 1.0;   // fade-in seconds
  const OUTRO = 0.5;   // fade-out seconds
  const GAP = 1.5;     // empty hold before the next cycle
  const [opacity, setOpacity] = useState(0);
  const [cinePlaying, setCinePlaying] = useState(true);
  const clockRef = useRef(0);
  const lastRef = useRef<number | undefined>(undefined);

  // When embedded in an iframe (e.g. Confluence), pin the tree to the top-left
  // and the controls to the bottom-right instead of centering vertically.
  const isEmbedded = useMemo(() => {
    try { return window.self !== window.top; } catch { return true; }
  }, []);

  const show = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  // The cinematic clock owns the playhead in fullscreen, so the built-in
  // playback loop must stay off the whole time. Re-pause whenever anything turns
  // it back on — notably the autoplay-on-share effect, which fires right AFTER
  // this child mounts (child effects run before parent effects), so a one-shot
  // pause on mount loses the race and both loops end up driving the playhead,
  // making play/pause appear dead.
  useEffect(() => {
    if (playback.playing) playback.pause();
  }, [playback.playing]);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  useEffect(() => {
    if (!cinePlaying) { lastRef.current = undefined; return; }
    const dur = animState.duration;
    // Frame to hold during outro + gap — the latest keyframe, so the tree never
    // snaps back to the first frame before fading out.
    const lastTime = animState.keyframes.reduce((m, kf) => Math.max(m, kf.time), 0);
    let raf = 0;
    const tick = (now: number) => {
      const dt = lastRef.current !== undefined ? (now - lastRef.current) / 1000 : 0;
      lastRef.current = now;
      let t = clockRef.current + dt * animState.speed;

      const introEnd = INTRO;
      const playEnd = INTRO + dur;
      const outroEnd = playEnd + OUTRO;
      const cycleEnd = outroEnd + GAP;

      if (!animState.loop && t >= playEnd) {
        // Single play: settle on the final frame, fully visible.
        clockRef.current = playEnd;
        playback.setPlayhead(lastTime);
        setOpacity(1);
        setCinePlaying(false);
        return;
      }
      if (t >= cycleEnd) t -= cycleEnd; // restart the cinematic cycle
      clockRef.current = t;

      if (t < introEnd) {
        // Intro: hold the FIRST frame, fading in.
        playback.setPlayhead(0);
        setOpacity(t / INTRO);
      } else if (t < playEnd) {
        // Playing.
        playback.setPlayhead(t - INTRO);
        setOpacity(1);
      } else {
        // Outro + gap: hold the LAST frame; fade it out, then stay empty.
        playback.setPlayhead(lastTime);
        setOpacity(t < outroEnd ? 1 - (t - playEnd) / OUTRO : 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); lastRef.current = undefined; };
  }, [cinePlaying, animState.duration, animState.speed, animState.loop, animState.keyframes]);

  const handleClick = useCallback(() => { show(); }, [show]);

  // Leave the cinematic auto-loop and enter manual mode: freeze on the current
  // frame, fully visible, so seek/step controls drive the playhead directly.
  const enterManual = useCallback(() => {
    setCinePlaying(false);
    setOpacity(1);
  }, []);

  const handleToggle = useCallback(() => {
    if (cinePlaying) {
      enterManual();
      return;
    }
    // Resume the cinematic cycle. Continue the play phase from the current
    // playhead, or restart from the intro if we're already at/after the end.
    const lastTime = animState.keyframes.reduce((m, kf) => Math.max(m, kf.time), 0);
    clockRef.current = playback.playhead >= lastTime - 0.001 ? 0 : INTRO + playback.playhead;
    setCinePlaying(true);
  }, [cinePlaying, enterManual, animState.keyframes, playback.playhead]);

  const handleSeek = useCallback((t: number) => { enterManual(); playback.setPlayhead(t); }, [enterManual, playback]);
  const handleStepBackward = useCallback(() => { enterManual(); playback.stepBackward(); }, [enterManual, playback]);
  const handleStepForward = useCallback(() => { enterManual(); playback.stepForward(); }, [enterManual, playback]);
  const handleSeekToStart = useCallback(() => { enterManual(); playback.seekToStart(); }, [enterManual, playback]);
  const handleSeekToEnd = useCallback(() => { enterManual(); playback.seekToEnd(); }, [enterManual, playback]);

  return (
    <div className={`animate-fullscreen-layout ${isEmbedded ? "embedded" : ""}`} onClick={handleClick}>
      <div className="animate-preview-area" ref={previewRef}>
        <div style={{ opacity, width: "100%", height: "100%", display: "flex", alignItems: isEmbedded ? "flex-start" : "center", justifyContent: isEmbedded ? "flex-start" : "center" }}>
          <AnimatedPreview nodes={interpolatedNodes} activeLabel={activeLabel} centered fixedHeight={maxHeight} badgeColumnX={badgeColumnX} />
        </div>
      </div>
      <div className={`animate-fullscreen-controls-wrap ${visible ? "visible" : ""}`} onMouseEnter={() => { setVisible(true); if (hideTimer.current) clearTimeout(hideTimer.current); }} onMouseLeave={show}>
        <PlayerControls
          className="animate-controls-fullscreen"
          playing={cinePlaying}
          playhead={playback.playhead}
          duration={animState.duration}
          loop={animState.loop}
          speed={animState.speed}
          onToggle={handleToggle}
          onStepBackward={handleStepBackward}
          onStepForward={handleStepForward}
          onSeekToStart={handleSeekToStart}
          onSeekToEnd={handleSeekToEnd}
          onSeek={handleSeek}
          onLoopChange={onLoopChange}
          onSpeedChange={onSpeedChange}
          onFullscreen={onExit}
        />
      </div>
    </div>
  );
}

function KeyframeEditor({
  keyframe, label, tabId, onChange, displayMode, onDisplayModeChange, onUndo, onRedo,
}: {
  keyframe: AnimateKeyframe;
  label: string;
  tabId: string;
  onChange: (doc: any, textBuffer: string) => void;
  displayMode: string;
  onDisplayModeChange: (mode: string) => void;
  onUndo: () => boolean;
  onRedo: () => boolean;
}) {
  const instance = useTreeboxInstance({
    initialDoc: keyframe.document,
    initialText: keyframe.textBuffer,
    defaultDisplayMode: displayMode as any,
    instanceId: `animate-editor-${tabId}-${keyframe.id}`,
    includeAllIds: true,
  });

  useEffect(() => {
    onDisplayModeChange(instance.displayMode);
  }, [instance.displayMode]);

  useGlobalUndo(instance, { onUndo, onRedo });

  const lastDocRef = useRef(instance.doc);
  useEffect(() => {
    if (instance.doc === lastDocRef.current) return;
    lastDocRef.current = instance.doc;
    onChange(instance.doc, instance.textBuffer);
  }, [instance.doc, instance.textBuffer, onChange]);

  return (
    <ActiveInstanceProvider instance={instance}>
      <TreeboxPane instance={instance} label={label} />
    </ActiveInstanceProvider>
  );
}
