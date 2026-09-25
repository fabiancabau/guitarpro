import type { ScoreTrack } from '@domain/types';

export type InstrumentKind = 'guitar' | 'bass' | 'drums' | 'keys' | 'vocals';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function programOf(track: ScoreTrack): number | null {
  const match = /(\d+)/.exec(track.instrument ?? '');
  return match ? Number(match[1]) : null;
}

export function instrumentKind(track: ScoreTrack): InstrumentKind {
  const name = track.name.toLowerCase();

  if (track.isPercussion || /drum|perc|kit|cymbal/.test(name)) return 'drums';
  if (/bass/.test(name)) return 'bass';
  if (/vocal|voice|vox|sing/.test(name)) return 'vocals';
  if (/piano|key|synth|organ|pad/.test(name)) return 'keys';

  const program = programOf(track);
  if (program !== null) {
    if (program >= 32 && program <= 39) return 'bass';
    if (program <= 7 || (program >= 16 && program <= 23) || (program >= 80 && program <= 95)) return 'keys';
    if (program >= 52 && program <= 54) return 'vocals';
  }

  return 'guitar';
}

/** Formats a tuning (MIDI numbers or note names, high string first) as low-to-high note names. */
export function formatTuning(tuning: string[] | undefined): string | null {
  if (!tuning || tuning.length === 0) return null;

  const notes = tuning.map((value) => {
    const midi = Number(value);
    return Number.isFinite(midi) && value.trim() !== '' ? NOTE_NAMES[((midi % 12) + 12) % 12] : value;
  });

  return [...notes].reverse().join(' ');
}

export function formatClock(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
