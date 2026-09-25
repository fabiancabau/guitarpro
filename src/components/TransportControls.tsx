import { useMemo, useState, type CSSProperties } from 'react';
import type { LoopRange } from '@domain/types';
import { formatClock } from '@lib/instruments';
import { Popover } from './Popover';
import {
  FollowIcon,
  LoopIcon,
  PauseIcon,
  PitchIcon,
  PlayIcon,
  SpeedIcon,
  VideoIcon,
  VolumeIcon
} from './Icons';

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
  progress: number;
  currentTimeMs?: number;
  endTimeMs?: number;
  isVideoOpen: boolean;
  hasVideo: boolean;
  onTogglePlayback: () => void;
  onAutoscrollChange: (enabled: boolean) => void;
  onPitchShiftChange: (semitones: number) => void;
  onTempoChange: (tempoPercent: number) => void;
  onVolumeChange: (volumePercent: number) => void;
  onLoopChange: (range: LoopRange | null) => void;
  onSeek: (progress: number) => void;
  onToggleVideo: () => void;
}

const SPEED_PRESETS = [50, 75, 90, 100, 125];

function fill(value: number, min: number, max: number): CSSProperties {
  return { '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties;
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
  progress,
  currentTimeMs,
  endTimeMs,
  isVideoOpen,
  hasVideo,
  onTogglePlayback,
  onAutoscrollChange,
  onPitchShiftChange,
  onTempoChange,
  onVolumeChange,
  onLoopChange,
  onSeek,
  onToggleVideo
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

  const timelineStyle = {
    '--progress': `${progress * 100}%`
  } as CSSProperties;

  const loopStyle =
    loopRange && totalBars > 0
      ? ({
          left: `${((loopRange.startBar - 1) / totalBars) * 100}%`,
          width: `${((loopRange.endBar - loopRange.startBar + 1) / totalBars) * 100}%`
        } satisfies CSSProperties)
      : null;

  const hasClock = endTimeMs !== undefined && endTimeMs > 0;
  const loopDisabled = disabled || totalBars <= 0;

  return (
    <section className="transport" aria-label="Playback controls">
      <div className="transport__timeline" style={timelineStyle}>
        {loopStyle ? <span className="transport__loop-band" style={loopStyle} aria-hidden="true" /> : null}
        <input
          className="transport__scrubber"
          aria-label="Playback timeline"
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          disabled={disabled}
          onChange={(event) => onSeek(Number(event.currentTarget.value) / 1000)}
        />
      </div>

      <div className="transport__row">
        <div className="transport__left">
          <button
            type="button"
            className={`play-button${isPlaying ? ' is-playing' : ''}`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            onClick={onTogglePlayback}
            disabled={disabled}
          >
            {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
          </button>

          <div className="transport__readout" aria-live="off">
            <span className="transport__bar">
              <span className="transport__bar-label">Bar</span>
              <strong>{currentBar ?? '–'}</strong>
              <span className="transport__bar-total">/ {totalBars || '–'}</span>
            </span>
            {hasClock ? (
              <span className="transport__clock">
                {formatClock(currentTimeMs ?? 0)} <span>/ {formatClock(endTimeMs)}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="transport__controls">
          <Popover
            triggerLabel="Playback speed"
            isActive={tempoPercent !== 100}
            disabled={disabled}
            trigger={
              <>
                <SpeedIcon size={18} />
                <span className="chip__value">{tempoPercent}%</span>
              </>
            }
          >
            <div className="panel">
              <div className="panel__heading">
                <span>Speed</span>
                <strong>{tempoPercent}%</strong>
              </div>
              <input
                type="range"
                aria-label={`Tempo (${tempoPercent}%)`}
                style={fill(tempoPercent, 30, 200)}
                min={30}
                max={200}
                value={tempoPercent}
                disabled={disabled}
                onChange={(event) => onTempoChange(Number(event.currentTarget.value))}
              />
              <div className="panel__presets">
                {SPEED_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset${preset === tempoPercent ? ' is-active' : ''}`}
                    disabled={disabled}
                    onClick={() => onTempoChange(preset)}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </Popover>

          <Popover
            triggerLabel="Pitch shift"
            isActive={pitchShiftSemitones !== 0}
            disabled={disabled}
            trigger={
              <>
                <PitchIcon size={18} />
                <span className="chip__value">{formatPitchShiftSemitones(pitchShiftSemitones)}</span>
              </>
            }
          >
            <div className="panel">
              <div className="panel__heading">
                <span>Pitch</span>
                <strong>{formatPitchShiftSemitones(pitchShiftSemitones)}</strong>
              </div>
              <input
                type="range"
                aria-label={`Pitch (${formatPitchShiftSemitones(pitchShiftSemitones)})`}
                style={fill(pitchShiftSemitones, -12, 12)}
                min={-12}
                max={12}
                step={1}
                value={pitchShiftSemitones}
                disabled={disabled}
                onChange={(event) => onPitchShiftChange(Number(event.currentTarget.value))}
              />
              <div className="panel__scale" aria-hidden="true">
                <span>-12</span>
                <span>0</span>
                <span>+12</span>
              </div>
              <div className="panel__presets">
                <button type="button" className="preset" disabled={disabled} onClick={() => onPitchShiftChange(pitchShiftSemitones - 1)}>
                  −1 st
                </button>
                <button type="button" className="preset" disabled={disabled} onClick={() => onPitchShiftChange(0)}>
                  Reset
                </button>
                <button type="button" className="preset" disabled={disabled} onClick={() => onPitchShiftChange(pitchShiftSemitones + 1)}>
                  +1 st
                </button>
              </div>
            </div>
          </Popover>

          <Popover
            triggerLabel="Loop bars"
            isActive={Boolean(loopRange)}
            disabled={loopDisabled}
            trigger={
              <>
                <LoopIcon size={18} />
                <span className="chip__value">{loopRange ? `${loopRange.startBar}–${loopRange.endBar}` : 'Loop'}</span>
              </>
            }
          >
            <div className="panel" role="group" aria-label="Loop controls">
              <div className="panel__heading">
                <span>Loop bars</span>
                <strong>{loopRange ? `${loopRange.startBar}–${loopRange.endBar}` : 'Off'}</strong>
              </div>
              <div className="panel__fields">
                <label>
                  <span>Start</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, totalBars)}
                    value={loopStart}
                    disabled={loopDisabled}
                    onChange={(event) => setLoopStart(Number(event.currentTarget.value))}
                  />
                </label>
                <label>
                  <span>End</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, totalBars)}
                    value={loopEnd}
                    disabled={loopDisabled}
                    onChange={(event) => setLoopEnd(Number(event.currentTarget.value))}
                  />
                </label>
              </div>
              {currentBar ? (
                <button
                  type="button"
                  className="preset preset--wide"
                  disabled={loopDisabled}
                  onClick={() => {
                    setLoopStart(currentBar);
                    setLoopEnd(Math.min(Math.max(1, totalBars), currentBar + 3));
                  }}
                >
                  Use bars {currentBar}–{Math.min(Math.max(1, totalBars), currentBar + 3)}
                </button>
              ) : null}
              <div className="panel__actions">
                <button type="button" className="button button--ghost" disabled={disabled} onClick={() => onLoopChange(null)}>
                  Clear
                </button>
                <button
                  type="button"
                  className="button button--accent"
                  disabled={loopDisabled}
                  onClick={() => onLoopChange(clampedLoopPreview)}
                >
                  Apply loop
                </button>
              </div>
            </div>
          </Popover>

          <button
            type="button"
            className={`chip${isAutoscrollEnabled ? ' is-active' : ''}`}
            aria-label="Autoscroll playhead"
            title="Follow the playhead"
            aria-pressed={isAutoscrollEnabled}
            disabled={disabled}
            onClick={() => onAutoscrollChange(!isAutoscrollEnabled)}
          >
            <FollowIcon size={18} />
            <span className="chip__value chip__value--optional">Follow</span>
          </button>

          <Popover
            triggerLabel="Master volume"
            disabled={disabled}
            align="end"
            trigger={<VolumeIcon size={18} muted={volumePercent === 0} />}
          >
            <div className="panel">
              <div className="panel__heading">
                <span>Master volume</span>
                <strong>{volumePercent}%</strong>
              </div>
              <input
                type="range"
                aria-label={`Volume (${volumePercent}%)`}
                style={fill(volumePercent, 0, 100)}
                min={0}
                max={100}
                value={volumePercent}
                disabled={disabled}
                onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
              />
            </div>
          </Popover>

          <span className="transport__divider" aria-hidden="true" />

          <button
            type="button"
            className={`chip${isVideoOpen ? ' is-open' : ''}${hasVideo ? ' is-active' : ''}`}
            aria-label="YouTube sync"
            title="YouTube sync"
            aria-pressed={isVideoOpen}
            onClick={onToggleVideo}
          >
            <VideoIcon size={18} />
            <span className="chip__value chip__value--optional">Video</span>
          </button>
        </div>
      </div>
    </section>
  );
}
