export interface ScoreMeta {
  title?: string;
  artist?: string;
  album?: string;
  tempo?: number;
}

export interface ScoreTrack {
  id: string;
  name: string;
  volumePercent?: number;
  tuning?: string[];
  instrument?: string;
  isPercussion?: boolean;
}

export interface ScoreLength {
  bars: number;
  durationMs?: number;
  durationTicks?: number;
}

export interface LoopRange {
  startBar: number;
  endBar: number;
}

export interface ExternalMediaHandler {
  backingTrackDuration: number;
  playbackRate: number;
  masterVolume: number;
  seekTo(time: number): void;
  play(): void;
  pause(): void;
}

export interface PlaybackPosition {
  currentTick: number;
  endTick: number;
  progress: number;
  currentTimeMs?: number;
  endTimeMs?: number;
  barIndex?: number;
  beatIndex?: number;
}

export interface ScoreSyncInfo {
  syncPointCount: number;
}

export interface ScoreSession {
  meta: ScoreMeta;
  tracks: ScoreTrack[];
  length: ScoreLength;
  sync: ScoreSyncInfo;
}
