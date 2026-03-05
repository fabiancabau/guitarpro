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
}

export interface ScoreLength {
  bars: number;
  durationMs?: number;
  durationTicks?: number;
}

export interface ScoreSession {
  meta: ScoreMeta;
  tracks: ScoreTrack[];
  length: ScoreLength;
}

export interface LoopRange {
  startBar: number;
  endBar: number;
}

export interface PlaybackPosition {
  currentTick: number;
  endTick: number;
  progress: number;
  barIndex?: number;
  beatIndex?: number;
}
