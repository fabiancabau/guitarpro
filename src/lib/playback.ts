import type { LoopRange } from '@domain/types';

const MIN_TEMPO_PERCENT = 30;
const MAX_TEMPO_PERCENT = 200;
const MIN_PITCH_SHIFT_SEMITONES = -12;
const MAX_PITCH_SHIFT_SEMITONES = 12;

export function clampTempoPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.min(MAX_TEMPO_PERCENT, Math.max(MIN_TEMPO_PERCENT, Math.round(value)));
}

export function clampPitchShiftSemitones(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_PITCH_SHIFT_SEMITONES, Math.max(MIN_PITCH_SHIFT_SEMITONES, Math.round(value)));
}

export function normalizeProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
}

export function normalizeLoopRange(range: LoopRange | null, totalBars: number): LoopRange | null {
  if (!range || totalBars <= 0) {
    return null;
  }

  const startBar = Math.max(1, Math.min(totalBars, range.startBar));
  const endBar = Math.max(1, Math.min(totalBars, range.endBar));

  if (endBar < startBar) {
    return { startBar: endBar, endBar: startBar };
  }

  return { startBar, endBar };
}

export function progressToTicks(progress: number, endTick: number): number {
  if (endTick <= 0) {
    return 0;
  }

  return Math.round(normalizeProgress(progress) * endTick);
}
