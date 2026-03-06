import { clampPitchShiftSemitones, clampTempoPercent, normalizeLoopRange, normalizeProgress, progressToTicks } from './playback';

describe('playback helpers', () => {
  it('clamps tempo range', () => {
    expect(clampTempoPercent(10)).toBe(30);
    expect(clampTempoPercent(120)).toBe(120);
    expect(clampTempoPercent(500)).toBe(200);
  });

  it('clamps pitch shift range', () => {
    expect(clampPitchShiftSemitones(-30)).toBe(-12);
    expect(clampPitchShiftSemitones(7)).toBe(7);
    expect(clampPitchShiftSemitones(30)).toBe(12);
  });

  it('normalizes loop ranges within bar limits', () => {
    expect(normalizeLoopRange({ startBar: 10, endBar: 4 }, 8)).toEqual({ startBar: 4, endBar: 8 });
    expect(normalizeLoopRange(null, 8)).toBeNull();
  });

  it('keeps progress in [0..1]', () => {
    expect(normalizeProgress(-1)).toBe(0);
    expect(normalizeProgress(1.2)).toBe(1);
  });

  it('converts progress to tick', () => {
    expect(progressToTicks(0.5, 200)).toBe(100);
  });
});
