import type { ExternalMediaHandler, LoopRange, ScoreMeta, ScoreSession } from '@domain/types';
import type { TabEngineCallbacks } from '@domain/events';

export interface TabEngine {
  setCallbacks(callbacks: TabEngineCallbacks): void;
  attach(container: HTMLElement): Promise<void>;
  load(buffer: ArrayBuffer): Promise<ScoreSession>;
  loadSongsterrJson(tracks: unknown[], metadata?: ScoreMeta): Promise<ScoreSession>;
  play(): void;
  pause(): void;
  seek(ticksOrMs: number): void;
  setAutoscroll(enabled: boolean): void;
  setPitchShift(semitones: number): void;
  setTempo(percent: number): void;
  setVolume(percent: number): void;
  setTrackVolume(trackId: string, percent: number): void;
  setLoop(range: LoopRange | null): void;
  selectTrack(trackId: string): void;
  setExternalMediaHandler(handler: ExternalMediaHandler | null): void;
  updateExternalMediaPosition(currentTimeMs: number): void;
  destroy(): void;
}

export type TabEngineFactory = () => TabEngine;
