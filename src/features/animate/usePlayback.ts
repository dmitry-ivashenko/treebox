import { useState, useEffect, useRef, useCallback } from "react";
import type { AnimateModeState, AnimateKeyframe } from "../../core/tabs/types";

export function usePlayback(state: AnimateModeState) {
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  useEffect(() => {
    if (!playing) {
      lastTimeRef.current = undefined;
      return;
    }
    const tick = (now: number) => {
      const delta = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = now;
      setPlayhead(prev => {
        const next = prev + delta * state.speed;
        if (next >= state.duration) {
          if (state.loop) return 0;
          setPlaying(false);
          return state.duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, state.speed, state.duration, state.loop]);

  const seekTo = useCallback((t: number) => {
    setPlayhead(Math.max(0, Math.min(state.duration, t)));
  }, [state.duration]);

  const stepForward = useCallback(() => {
    const nextKf = state.keyframes.find(kf => kf.time > playhead + 0.01);
    if (nextKf) setPlayhead(nextKf.time);
  }, [playhead, state.keyframes]);

  const stepBackward = useCallback(() => {
    const sorted = [...state.keyframes].sort((a, b) => b.time - a.time);
    const prevKf = sorted.find(kf => kf.time < playhead - 0.01);
    if (prevKf) setPlayhead(prevKf.time);
    else setPlayhead(0);
  }, [playhead, state.keyframes]);

  return {
    playhead,
    setPlayhead: seekTo,
    playing,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    toggle: useCallback(() => setPlaying(p => !p), []),
    stepForward,
    stepBackward,
    seekToStart: useCallback(() => setPlayhead(0), []),
    seekToEnd: useCallback(() => setPlayhead(state.duration), [state.duration]),
  };
}

export function currentKeyframeIndex(keyframes: AnimateKeyframe[], playhead: number): number {
  for (let i = keyframes.length - 1; i >= 0; i--) {
    if (keyframes[i].time <= playhead + 0.001) return i;
  }
  return 0;
}
