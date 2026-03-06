import { useMemo, useState } from 'react';
import type { LoopRange } from '@domain/types';

interface TransportControlsProps {
  disabled: boolean;
  isPlaying: boolean;
  isAutoscrollEnabled: boolean;
  pitchShiftSemitones: number;
  tempoPercent: number;
  volumePercent: number;
  totalBars: number;
  loopRange: LoopRange | null;
  currentBar: number | null;
  onTogglePlayback: () => void;
  onAutoscrollChange: (enabled: boolean) => void;
  onPitchShiftChange: (semitones: number) => void;
  onTempoChange: (tempoPercent: number) => void;
  onVolumeChange: (volumePercent: number) => void;
  onLoopChange: (range: LoopRange | null) => void;
}

function formatPitchShiftSemitones(semitones: number): string {
  if (semitones > 0) {
    return `+${semitones} st`;
  }

  if (semitones < 0) {
    return `${semitones} st`;
  }

  return '0 st';
}

export function TransportControls({
  disabled,
  isPlaying,
  isAutoscrollEnabled,
  pitchShiftSemitones,
  tempoPercent,
  volumePercent,
  totalBars,
  loopRange,
  currentBar,
  onTogglePlayback,
  onAutoscrollChange,
  onPitchShiftChange,
  onTempoChange,
  onVolumeChange,
  onLoopChange
}: TransportControlsProps) {
  const [loopStart, setLoopStart] = useState<number>(loopRange?.startBar ?? 1);
  const [loopEnd, setLoopEnd] = useState<number>(loopRange?.endBar ?? Math.max(1, totalBars));

  const clampedLoopPreview = useMemo(() => {
    const maxBar = Math.max(1, totalBars);
    return {
      startBar: Math.max(1, Math.min(maxBar, loopStart)),
      endBar: Math.max(1, Math.min(maxBar, loopEnd))
    };
  }, [loopEnd, loopStart, totalBars]);

  return (
    <section className="transport-controls" aria-label="Playback controls">
      <button type="button" className="primary-button" onClick={onTogglePlayback} disabled={disabled}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <label className="transport-controls__toggle">
        <input
          type="checkbox"
          checked={isAutoscrollEnabled}
          disabled={disabled}
          onChange={(event) => onAutoscrollChange(event.currentTarget.checked)}
        />
        <span>Autoscroll playhead</span>
      </label>

      <label className="control-group">
        <span className="control-group__label">Tempo ({tempoPercent}%)</span>
        <input
          type="range"
          min={30}
          max={200}
          value={tempoPercent}
          disabled={disabled}
          onChange={(event) => onTempoChange(Number(event.currentTarget.value))}
        />
      </label>

      <label className="control-group">
        <span className="control-group__label">Pitch ({formatPitchShiftSemitones(pitchShiftSemitones)})</span>
        <input
          type="range"
          min={-12}
          max={12}
          step={1}
          value={pitchShiftSemitones}
          disabled={disabled}
          onChange={(event) => onPitchShiftChange(Number(event.currentTarget.value))}
        />
      </label>

      <label className="control-group">
        <span className="control-group__label">Volume ({volumePercent}%)</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volumePercent}
          disabled={disabled}
          onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
        />
      </label>

      <div className="control-group transport-controls__loop" aria-label="Loop controls">
        <span className="control-group__label">Loop bars</span>
        <div className="transport-controls__loop-inputs">
          <label>
            Start
            <input
              type="number"
              min={1}
              max={Math.max(1, totalBars)}
              value={loopStart}
              disabled={disabled || totalBars <= 0}
              onChange={(event) => setLoopStart(Number(event.currentTarget.value))}
            />
          </label>
          <label>
            End
            <input
              type="number"
              min={1}
              max={Math.max(1, totalBars)}
              value={loopEnd}
              disabled={disabled || totalBars <= 0}
              onChange={(event) => setLoopEnd(Number(event.currentTarget.value))}
            />
          </label>
        </div>
        <div className="transport-controls__loop-buttons">
          <button
            type="button"
            className="ghost-button"
            disabled={disabled || totalBars <= 0}
            onClick={() => onLoopChange(clampedLoopPreview)}
          >
            Apply loop
          </button>
          <button type="button" className="ghost-button" disabled={disabled} onClick={() => onLoopChange(null)}>
            Clear loop
          </button>
        </div>
      </div>

      <p className="transport-controls__status">
        {currentBar ? `Bar ${currentBar}` : 'Bar -'}
        {pitchShiftSemitones !== 0 ? ` · Pitch ${formatPitchShiftSemitones(pitchShiftSemitones)}` : ''}
        {loopRange ? ` · Loop ${loopRange.startBar}-${loopRange.endBar}` : ''}
      </p>
    </section>
  );
}
