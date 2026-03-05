import type { PlaybackPosition, ScoreSession } from '@domain/types';
import type { ReaderEngineError } from '@domain/errors';

export interface TabEngineCallbacks {
  onReady?: (session: ScoreSession) => void;
  onPositionChange?: (position: PlaybackPosition) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onError?: (error: ReaderEngineError) => void;
}
