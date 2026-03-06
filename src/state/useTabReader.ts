import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createTabEngine } from '@adapters/index';
import type {
  LoopRange,
  PlaybackPosition,
  ReaderEngineError,
  ScoreSession,
  TabEngine,
  TabEngineFactory
} from '@domain/index';
import { mapEngineError } from '@lib/errorMapping';
import { readFileAsArrayBuffer, validateGuitarProFile } from '@lib/fileValidation';
import { clampPitchShiftSemitones, clampTempoPercent, normalizeLoopRange, normalizeProgress, progressToTicks } from '@lib/playback';

type ReaderStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TabReaderState {
  status: ReaderStatus;
  fileName: string | null;
  session: ScoreSession | null;
  selectedTrackId: string | null;
  trackVolumes: Record<string, number>;
  position: PlaybackPosition | null;
  isPlaying: boolean;
  isAutoscrollEnabled: boolean;
  pitchShiftSemitones: number;
  tempoPercent: number;
  volumePercent: number;
  loopRange: LoopRange | null;
  error: ReaderEngineError | null;
}

const INITIAL_STATE: TabReaderState = {
  status: 'idle',
  fileName: null,
  session: null,
  selectedTrackId: null,
  trackVolumes: {},
  position: null,
  isPlaying: false,
  isAutoscrollEnabled: true,
  pitchShiftSemitones: 0,
  tempoPercent: 100,
  volumePercent: 30,
  loopRange: null,
  error: null
};

type Action =
  | { type: 'loading'; fileName: string }
  | { type: 'ready'; session: ScoreSession; selectedTrackId: string | null }
  | { type: 'error'; error: ReaderEngineError }
  | { type: 'clear-error' }
  | { type: 'playback'; isPlaying: boolean }
  | { type: 'position'; position: PlaybackPosition }
  | { type: 'autoscroll'; enabled: boolean }
  | { type: 'pitch-shift'; semitones: number }
  | { type: 'tempo'; tempoPercent: number }
  | { type: 'volume'; volumePercent: number }
  | { type: 'track-volume'; trackId: string; volumePercent: number }
  | { type: 'loop'; loopRange: LoopRange | null }
  | { type: 'track'; trackId: string | null };

function trackVolumesFromSession(session: ScoreSession): Record<string, number> {
  return Object.fromEntries(
    session.tracks.map((track) => [track.id, Math.max(0, Math.min(100, Math.round(track.volumePercent ?? 100)))])
  );
}

function reducer(state: TabReaderState, action: Action): TabReaderState {
  switch (action.type) {
    case 'loading':
      return {
        ...state,
        status: 'loading',
        fileName: action.fileName,
        error: null,
        isPlaying: false,
        position: null
      };
    case 'ready':
      return {
        ...state,
        status: 'ready',
        session: action.session,
        selectedTrackId: action.selectedTrackId,
        trackVolumes: trackVolumesFromSession(action.session),
        error: null,
        loopRange: null,
        position: {
          currentTick: 0,
          endTick: action.session.length.durationTicks ?? 0,
          progress: 0,
          barIndex: 0,
          beatIndex: 0
        }
      };
    case 'error':
      return {
        ...state,
        status: 'error',
        error: action.error,
        isPlaying: false
      };
    case 'clear-error':
      return { ...state, error: null, status: state.session ? 'ready' : 'idle' };
    case 'playback':
      return { ...state, isPlaying: action.isPlaying };
    case 'position':
      return { ...state, position: action.position };
    case 'autoscroll':
      return { ...state, isAutoscrollEnabled: action.enabled };
    case 'pitch-shift':
      return { ...state, pitchShiftSemitones: action.semitones };
    case 'tempo':
      return { ...state, tempoPercent: action.tempoPercent };
    case 'volume':
      return { ...state, volumePercent: action.volumePercent };
    case 'track-volume':
      return {
        ...state,
        trackVolumes: {
          ...state.trackVolumes,
          [action.trackId]: action.volumePercent
        }
      };
    case 'loop':
      return { ...state, loopRange: action.loopRange };
    case 'track':
      return { ...state, selectedTrackId: action.trackId };
    default:
      return state;
  }
}

interface UseTabReaderOptions {
  engineFactory?: TabEngineFactory;
}

export function useTabReader(options: UseTabReaderOptions = {}) {
  const { engineFactory = createTabEngine } = options;

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const [engine] = useState<TabEngine>(() => engineFactory());

  useEffect(() => {
    engine.setCallbacks({
      onReady: (session) => {
        const firstTrackId = session.tracks[0]?.id ?? null;
        dispatch({ type: 'ready', session, selectedTrackId: firstTrackId });
      },
      onPositionChange: (position) => {
        dispatch({ type: 'position', position: { ...position, progress: normalizeProgress(position.progress) } });
      },
      onPlaybackStateChange: (isPlaying) => {
        dispatch({ type: 'playback', isPlaying });
      },
      onError: (error) => {
        dispatch({ type: 'error', error });
      }
    });

    return () => {
      engine.destroy();
    };
  }, [engine]);

  const attachContainer = useCallback(
    async (container: HTMLElement) => {
      try {
        await engine.attach(container);
        engine.setAutoscroll(state.isAutoscrollEnabled);
        engine.setPitchShift(state.pitchShiftSemitones);
        engine.setVolume(state.volumePercent);
      } catch (error) {
        dispatch({ type: 'error', error: mapEngineError(error) });
      }
    },
    [engine, state.isAutoscrollEnabled, state.pitchShiftSemitones, state.volumePercent]
  );

  const openFile = useCallback(
    async (file: File) => {
      const validation = validateGuitarProFile(file);
      if (!validation.ok) {
        dispatch({ type: 'error', error: validation.error });
        return;
      }

      dispatch({ type: 'loading', fileName: file.name });

      try {
        const buffer = await readFileAsArrayBuffer(file);
        const session = await engine.load(buffer);
        engine.setPitchShift(state.pitchShiftSemitones);
        engine.setVolume(state.volumePercent);

        for (const track of session.tracks) {
          engine.setTrackVolume(track.id, track.volumePercent ?? 100);
        }

        const firstTrack = session.tracks[0]?.id ?? null;
        if (firstTrack) {
          engine.selectTrack(firstTrack);
          dispatch({ type: 'track', trackId: firstTrack });
        }
      } catch (error) {
        dispatch({ type: 'error', error: mapEngineError(error) });
      }
    },
    [engine, state.pitchShiftSemitones, state.volumePercent]
  );

  const togglePlayback = useCallback(() => {
    if (state.isPlaying) {
      engine.pause();
      return;
    }

    engine.play();
  }, [engine, state.isPlaying]);

  const seekByProgress = useCallback(
    (progress: number) => {
      const endTick = state.position?.endTick ?? state.session?.length.durationTicks ?? 0;
      const ticks = progressToTicks(progress, endTick);
      engine.seek(ticks);
    },
    [engine, state.position?.endTick, state.session?.length.durationTicks]
  );

  const setTempoPercent = useCallback(
    (value: number) => {
      const clamped = clampTempoPercent(value);
      engine.setTempo(clamped);
      dispatch({ type: 'tempo', tempoPercent: clamped });
    },
    [engine]
  );

  const setAutoscrollEnabled = useCallback(
    (enabled: boolean) => {
      engine.setAutoscroll(enabled);
      dispatch({ type: 'autoscroll', enabled });
    },
    [engine]
  );

  const setPitchShiftSemitones = useCallback(
    (value: number) => {
      const clamped = clampPitchShiftSemitones(value);
      engine.setPitchShift(clamped);
      dispatch({ type: 'pitch-shift', semitones: clamped });
    },
    [engine]
  );

  const setVolumePercent = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      engine.setVolume(clamped);
      dispatch({ type: 'volume', volumePercent: clamped });
    },
    [engine]
  );

  const setLoopRange = useCallback(
    (range: LoopRange | null) => {
      const bars = state.session?.length.bars ?? 0;
      const normalized = normalizeLoopRange(range, bars);
      engine.setLoop(normalized);
      dispatch({ type: 'loop', loopRange: normalized });
    },
    [engine, state.session?.length.bars]
  );

  const setTrackVolume = useCallback(
    (trackId: string, value: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      engine.setTrackVolume(trackId, clamped);
      dispatch({ type: 'track-volume', trackId, volumePercent: clamped });
    },
    [engine]
  );

  const selectTrack = useCallback(
    (trackId: string) => {
      engine.selectTrack(trackId);
      dispatch({ type: 'track', trackId });
    },
    [engine]
  );

  const clearError = useCallback(() => {
    dispatch({ type: 'clear-error' });
  }, []);

  return useMemo(
    () => ({
      state,
      attachContainer,
      openFile,
      togglePlayback,
      seekByProgress,
      setAutoscrollEnabled,
      setPitchShiftSemitones,
      setTempoPercent,
      setVolumePercent,
      setTrackVolume,
      setLoopRange,
      selectTrack,
      clearError
    }),
    [
      attachContainer,
      clearError,
      openFile,
      seekByProgress,
      selectTrack,
      setAutoscrollEnabled,
      setPitchShiftSemitones,
      setLoopRange,
      setTempoPercent,
      setTrackVolume,
      setVolumePercent,
      state,
      togglePlayback
    ]
  );
}
