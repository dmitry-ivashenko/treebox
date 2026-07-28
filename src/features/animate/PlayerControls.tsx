type Props = {
  playing: boolean;
  playhead: number;
  duration: number;
  loop: boolean;
  speed: number;
  onToggle: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSeekToStart: () => void;
  onSeekToEnd: () => void;
  onSeek: (t: number) => void;
  onLoopChange: (loop: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onFullscreen?: () => void;
  className?: string;
};

export function PlayerControls({
  playing, playhead, duration, loop, speed,
  onToggle, onStepBackward, onStepForward, onSeekToStart, onSeekToEnd,
  onSeek, onLoopChange, onSpeedChange, onFullscreen, className,
}: Props) {
  const formatTime = (t: number) => {
    const s = Math.floor(t);
    const ms = Math.floor((t - s) * 10);
    return `${s}.${ms}s`;
  };

  return (
    <div className={`animate-controls ${className ?? ""}`}>
      <div className="animate-controls-nav">
        <button className="btn btn-sm btn-icon" onClick={onSeekToStart} title="Start">⏮</button>
        <button className="btn btn-sm btn-icon" onClick={onStepBackward} title="Previous keyframe">◀</button>
        <button className="btn btn-sm btn-icon animate-play-btn" onClick={onToggle} title={playing ? "Pause" : "Play"}>
          {playing ? "⏸" : "▶"}
        </button>
        <button className="btn btn-sm btn-icon" onClick={onStepForward} title="Next keyframe">▶▶</button>
        <button className="btn btn-sm btn-icon" onClick={onSeekToEnd} title="End">⏭</button>
      </div>
      <div className="animate-controls-bottom">
        <span className="animate-time animate-time-current">{formatTime(playhead)}</span>
        <input
          type="range"
          className="animate-scrubber"
          min={0}
          max={duration}
          step={0.05}
          value={playhead}
          onChange={e => onSeek(parseFloat(e.target.value))}
        />
        <span className="animate-time">{formatTime(duration)}</span>
      </div>
      <div className="animate-controls-end">
        <div className="animate-controls-end-left">
          <button
            className={`btn btn-sm ${loop ? "btn-active" : ""}`}
            onClick={() => onLoopChange(!loop)}
            title="Loop"
          >
            Loop
          </button>
          <select
            className="animate-speed-select"
            value={speed}
            onChange={e => onSpeedChange(parseFloat(e.target.value))}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </div>
        {onFullscreen && (
          <button className="btn btn-sm btn-icon" onClick={onFullscreen} title="Fullscreen">⛶</button>
        )}
      </div>
    </div>
  );
}
