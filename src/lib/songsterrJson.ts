import { model, Settings } from '@coderline/alphatab';
import { ReaderEngineError } from '@domain/errors';
import type { ScoreMeta } from '@domain/types';

type JsonRecord = Record<string, unknown>;

interface SourceNote {
  fret?: number;
  string?: number;
  rest?: boolean;
  tie?: boolean;
  hp?: boolean;
  ghost?: boolean;
  staccato?: boolean;
  accentuated?: number;
  vibrato?: boolean;
  slide?: string;
  harmonic?: string;
  harmonicFret?: number;
  bend?: { points?: Array<{ position: number; tone: number }> };
}

interface SourceBeat {
  type: number;
  notes: SourceNote[];
  dots?: number;
  tuplet?: number;
  rest?: boolean;
  palmMute?: boolean;
  letRing?: boolean;
  vibrato?: boolean;
  tapping?: boolean;
  upStroke?: number;
  graceNote?: string;
  velocity?: string;
  text?: { text?: string };
  brushStroke?: { direction?: string; duration?: number };
}

interface SourceMeasure {
  voices: Array<{ beats: SourceBeat[] }>;
  signature?: [number, number];
  marker?: { text?: string };
}

interface SourceTrack {
  name: string;
  partId: number;
  songId: number;
  revisionId: number;
  instrument: string;
  instrumentId: number;
  strings: number;
  tuning?: number[];
  volume?: number;
  measures: SourceMeasure[];
  sounds?: Array<{ instrumentId: number }>;
  automations?: { tempo?: Array<{ measure: number; position: number; bpm: number }> };
  trackAutomations?: { trackSoundAutomations?: Array<{ soundId: number; measure: number; position: number }> };
}

function invalid(message: string): never {
  throw new ReaderEngineError('PARSE_FAILED', `Song JSON: ${message}`);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readTrack(value: unknown, index: number): SourceTrack {
  if (!isRecord(value)) invalid(`track ${index + 1} is not an object.`);
  if (!Number.isInteger(value.partId) || !Number.isInteger(value.songId) || !Number.isInteger(value.revisionId)) {
    invalid(`track ${index + 1} is missing its song, revision, or part ID.`);
  }
  if (!Array.isArray(value.measures) || value.measures.length === 0) {
    invalid(`track ${index + 1} has no measures.`);
  }
  if (!Number.isInteger(value.strings) || typeof value.instrumentId !== 'number') {
    invalid(`track ${index + 1} is missing its instrument settings.`);
  }
  return value as unknown as SourceTrack;
}

function readBeat(value: unknown, location: string): SourceBeat {
  if (!isRecord(value) || ![1, 2, 4, 8, 16, 32, 64].includes(value.type as number) || !Array.isArray(value.notes)) {
    invalid(`${location} has an invalid beat.`);
  }
  return value as unknown as SourceBeat;
}

function addTempo(score: model.Score, tracks: SourceTrack[]): void {
  const tempos = tracks.flatMap((track) => track.automations?.tempo ?? []);
  const seen = new Set<string>();

  for (const tempo of tempos) {
    if (!Number.isInteger(tempo.measure) || tempo.measure < 0 || tempo.measure >= score.masterBars.length ||
        !Number.isFinite(tempo.bpm) || tempo.bpm <= 0) {
      invalid('tempo automation has an invalid measure or BPM.');
    }
    const key = `${tempo.measure}:${tempo.position}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const automation = new model.Automation();
    automation.type = model.AutomationType.Tempo;
    automation.value = tempo.bpm;
    automation.ratioPosition = tempo.position;
    score.masterBars[tempo.measure].tempoAutomations.push(automation);
  }
}

function addNotes(source: SourceBeat, beat: model.Beat, part: SourceTrack, previousNotes: Map<number, model.Note>): void {
  const percussion = part.instrumentId === 1024;

  for (const item of source.notes) {
    if (!isRecord(item)) invalid(`part ${part.partId} contains an invalid note.`);
    const raw = item as SourceNote;
    if (raw.rest) continue;
    if (typeof raw.fret !== 'number' || !Number.isInteger(raw.fret) || typeof raw.string !== 'number') {
      invalid(`part ${part.partId} contains a note without a fret or string.`);
    }

    const note = new model.Note();
    if (percussion) {
      note.percussionArticulation = raw.fret;
    } else {
      if (!Number.isInteger(raw.string) || raw.string < 0 || raw.string >= part.strings) {
        invalid(`part ${part.partId} contains an out-of-range string.`);
      }
      note.fret = raw.fret;
      note.string = part.strings - raw.string;
    }

    note.isTieDestination = raw.tie === true;
    note.isGhost = raw.ghost === true;
    note.isStaccato = raw.staccato === true;
    note.isPalmMute = source.palmMute === true;
    note.isLetRing = source.letRing === true;
    if (raw.accentuated === 1 || raw.accentuated === 2) note.accentuated = raw.accentuated;
    if (raw.vibrato) note.vibrato = model.VibratoType.Slight;
    if (raw.harmonic === 'natural') {
      note.harmonicType = model.HarmonicType.Natural;
      note.harmonicValue = raw.harmonicFret ?? raw.fret;
    }
    if (raw.slide === 'legato') note.slideOutType = model.SlideOutType.Legato;
    if (raw.slide === 'shift') note.slideOutType = model.SlideOutType.Shift;
    if (raw.slide === 'below') note.slideInType = model.SlideInType.IntoFromBelow;
    if (raw.bend?.points?.length) note.bendType = model.BendType.Custom;
    for (const point of raw.bend?.points ?? []) {
      note.addBendPoint(new model.BendPoint(point.position, Math.round(point.tone / 25)));
    }

    if (!percussion) {
      const previous = previousNotes.get(note.string);
      if (raw.hp && previous) previous.isHammerPullOrigin = true;
      if (!note.isTieDestination) previousNotes.set(note.string, note);
    }
    beat.addNote(note);
  }
}

function addTrack(score: model.Score, part: SourceTrack, index: number): void {
  const percussion = part.instrumentId === 1024;
  const track = new model.Track();
  track.name = part.name || part.instrument || `Track ${index + 1}`;
  track.playbackInfo.program = percussion ? 0 : part.instrumentId;
  const melodicIndex = score.tracks.filter((existing) => !existing.isPercussion).length;
  const channelPairs = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 10], [11, 12], [13, 14]];
  const channels = channelPairs[melodicIndex % channelPairs.length];
  track.playbackInfo.primaryChannel = percussion ? 9 : channels[0];
  track.playbackInfo.secondaryChannel = percussion ? 9 : channels[1];
  track.playbackInfo.volume = Math.max(0, Math.min(15, Math.round((part.volume ?? 1) * 15)));
  score.addTrack(track);

  const staff = new model.Staff();
  staff.isPercussion = percussion;
  staff.showTablature = !percussion;
  staff.showStandardNotation = true;
  if (!percussion) {
    if (!Array.isArray(part.tuning) || part.tuning.length !== part.strings || !part.tuning.every(Number.isFinite)) {
      invalid(`part ${part.partId} has invalid tuning.`);
    }
    staff.stringTuning = new model.Tuning('', part.tuning);
  }
  track.addStaff(staff);
  const previousNotes = new Map<number, model.Note>();

  part.measures.forEach((sourceMeasure, measureIndex) => {
    if (!isRecord(sourceMeasure) || !Array.isArray(sourceMeasure.voices)) {
      invalid(`part ${part.partId}, bar ${measureIndex + 1} has no voices.`);
    }
    const bar = new model.Bar();
    if (percussion) bar.clef = model.Clef.Neutral;
    else if (part.strings === 4) bar.clef = model.Clef.F4;
    staff.addBar(bar);

    const voices = sourceMeasure.voices.length > 0 ? sourceMeasure.voices : [{ beats: [] }];
    for (const sourceVoice of voices) {
      if (!isRecord(sourceVoice) || !Array.isArray(sourceVoice.beats)) {
        invalid(`part ${part.partId}, bar ${measureIndex + 1} has an invalid voice.`);
      }
      const voice = new model.Voice();
      bar.addVoice(voice);
      const beats = sourceVoice.beats.length > 0 ? sourceVoice.beats : [{ type: 1, notes: [{ rest: true }] }];

      for (const item of beats) {
        const sourceBeat = readBeat(item, `part ${part.partId}, bar ${measureIndex + 1}`);
        const beat = new model.Beat();
        beat.duration = sourceBeat.type;
        beat.dots = sourceBeat.dots ?? 0;
        if (sourceBeat.tuplet === 3) {
          beat.tupletNumerator = 3;
          beat.tupletDenominator = 2;
        }
        if (sourceBeat.graceNote === 'beforeBeat') beat.graceType = model.GraceType.BeforeBeat;
        beat.isPalmMute = sourceBeat.palmMute === true;
        beat.isLetRing = sourceBeat.letRing === true;
        if (sourceBeat.vibrato) beat.vibrato = model.VibratoType.Slight;
        if (sourceBeat.tapping) beat.tap = true;
        if (sourceBeat.text?.text) beat.text = sourceBeat.text.text;
        if (sourceBeat.upStroke) beat.pickStroke = model.PickStroke.Up;
        if (sourceBeat.brushStroke) {
          beat.brushType = sourceBeat.brushStroke.direction === 'up' ? model.BrushType.BrushUp : model.BrushType.BrushDown;
          beat.brushDuration = sourceBeat.brushStroke.duration ?? 0;
        }
        if (sourceBeat.velocity) {
          const dynamics: Record<string, model.DynamicValue> = {
            p: model.DynamicValue.P, mp: model.DynamicValue.MP, mf: model.DynamicValue.MF, f: model.DynamicValue.F
          };
          beat.dynamics = dynamics[sourceBeat.velocity] ?? model.DynamicValue.MF;
        }
        addNotes(sourceBeat, beat, part, previousNotes);
        voice.addBeat(beat);
      }
    }
  });

  for (const automation of part.trackAutomations?.trackSoundAutomations ?? []) {
    const instrumentId = part.sounds?.[automation.soundId]?.instrumentId;
    const beat = staff.bars[automation.measure]?.voices[0]?.beats[0];
    if (typeof instrumentId === 'number' && beat) {
      beat.automations.push(model.Automation.buildInstrumentAutomation(false, automation.position, instrumentId));
    }
  }
}

export function parseSongsterrJson(rawTracks: unknown[], metadata: ScoreMeta = {}): model.Score {
  if (rawTracks.length === 0) invalid('select at least one track JSON file.');
  const tracks = rawTracks.map(readTrack).sort((a, b) => a.partId - b.partId);
  const { songId, revisionId, measures } = tracks[0];
  const partIds = new Set<number>();
  for (const track of tracks) {
    if (track.songId !== songId || track.revisionId !== revisionId || track.measures.length !== measures.length) {
      invalid('all track files must belong to the same song revision and have the same number of bars.');
    }
    if (partIds.has(track.partId)) invalid(`part ${track.partId} was selected more than once.`);
    partIds.add(track.partId);
  }

  const score = new model.Score();
  score.title = metadata.title ?? `Song ${songId}`;
  score.artist = metadata.artist ?? '';
  score.album = metadata.album ?? '';

  let timeSignature: [number, number] = [4, 4];
  for (let index = 0; index < measures.length; index += 1) {
    const sourceMeasures = tracks.map((track) => track.measures[index]);
    const signature = sourceMeasures.find((measure) => measure.signature)?.signature;
    const marker = sourceMeasures.find((measure) => measure.marker?.text)?.marker?.text;
    const masterBar = new model.MasterBar();
    if (signature) timeSignature = signature;
    masterBar.timeSignatureNumerator = timeSignature[0];
    masterBar.timeSignatureDenominator = timeSignature[1];
    if (marker) {
      masterBar.section = new model.Section();
      masterBar.section.text = marker;
    }
    score.addMasterBar(masterBar);
  }
  addTempo(score, tracks);
  tracks.forEach((track, index) => addTrack(score, track, index));
  score.finish(new Settings());
  return score;
}
