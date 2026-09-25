import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabEngineFactory } from '@domain/tab-engine';
import { ErrorBanner } from '@components/ErrorBanner';
import { FileDropzone } from '@components/FileDropzone';
import { ScoreViewport } from '@components/ScoreViewport';
import { SessionMetadata } from '@components/SessionMetadata';
import { TrackSelector } from '@components/TrackSelector';
import { TransportControls } from '@components/TransportControls';
import { YouTubeSyncPanel } from '@components/YouTubeSyncPanel';
import { useTabReader } from '@state/useTabReader';
import { createYouTubeMedia, type CreateYouTubeMediaOptions, type YouTubeMediaHandle } from '@lib/youtube';
import { loadBundledSongTracks } from '@lib/bundledSong';
import './App.css';

interface AppProps {
  engineFactory?: TabEngineFactory;
  youtubeMediaFactory?: (options: CreateYouTubeMediaOptions) => Promise<YouTubeMediaHandle>;
}

export function App({ engineFactory, youtubeMediaFactory = createYouTubeMedia }: AppProps) {
  const reader = useTabReader({ engineFactory });
  const { state } = reader;
  const { setExternalMediaHandler, updateExternalMediaPosition } = reader;
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [playerMount, setPlayerMount] = useState<HTMLElement | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isBundledSongLoading, setIsBundledSongLoading] = useState(false);
  const [bundledSongError, setBundledSongError] = useState<string | null>(null);
  const songJsonInputRef = useRef<HTMLInputElement | null>(null);
  const mockModeEnabled =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mockEngine');

  const loadMockValidFile = () => {
    const mockFile = new File([new Uint8Array([77, 79, 67, 75])], 'mock.gp5', {
      type: 'application/octet-stream'
    });
    void reader.openFile(mockFile);
  };

  const loadMockInvalidFile = () => {
    const invalidFile = new File(['invalid'], 'mock.txt', { type: 'text/plain' });
    void reader.openFile(invalidFile);
  };

  const handlePlayerMount = useCallback((element: HTMLElement | null) => {
    setPlayerMount(element);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let handle: YouTubeMediaHandle | null = null;

    setExternalMediaHandler(null);

    if (!activeVideoId || !playerMount) {
      return;
    }

    void youtubeMediaFactory({
      container: playerMount,
      videoId: activeVideoId,
      onPositionChange: updateExternalMediaPosition
    })
      .then((nextHandle) => {
        if (cancelled) {
          nextHandle.destroy();
          return;
        }

        handle = nextHandle;
        setExternalMediaHandler(nextHandle.handler);
        setIsVideoLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setVideoError(error instanceof Error ? error.message : 'Unable to initialize the YouTube player.');
        setIsVideoLoading(false);
      });

    return () => {
      cancelled = true;
      setExternalMediaHandler(null);
      handle?.destroy();
    };
  }, [activeVideoId, playerMount, setExternalMediaHandler, updateExternalMediaPosition, youtubeMediaFactory]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="hero__eyebrow">Browser Guitar Pro Reader</p>
          <h1>On-device tablature and notation playback</h1>
          <div className="hero__song-loader">
            <button
              type="button"
              className="primary-button"
              disabled={isBundledSongLoading || state.status === 'loading'}
              onClick={() => {
                setIsBundledSongLoading(true);
                setBundledSongError(null);
                void loadBundledSongTracks()
                  .then((tracks) => reader.openSongsterrJson(tracks, 'song_data', {
                    title: 'Silhouette',
                    artist: 'Malevolence'
                  }, '1'))
                  .catch((error: unknown) => {
                    setBundledSongError(error instanceof Error ? error.message : 'Unable to load bundled song data.');
                  })
                  .finally(() => setIsBundledSongLoading(false));
              }}
            >
              {isBundledSongLoading ? 'Loading song...' : 'Open Silhouette from song_data'}
            </button>
            <span>Local JSON score · 7 tracks · works without Songsterr</span>
            {bundledSongError ? <p role="alert">{bundledSongError}</p> : null}
          </div>
          <div className="hero__song-loader">
            <input
              ref={songJsonInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="file-dropzone__input"
              aria-label="Song JSON track files"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = '';
                if (files.length > 0) void reader.openSongsterrFiles(files);
              }}
            />
            <button
              type="button"
              className="ghost-button"
              disabled={state.status === 'loading'}
              onClick={() => songJsonInputRef.current?.click()}
            >
              Import song JSON files
            </button>
            <span>Select all track JSON files from one song.</span>
          </div>
          {mockModeEnabled ? (
            <div className="hero__test-controls" aria-label="Mock test controls">
              <button type="button" className="ghost-button" onClick={loadMockValidFile}>
                Load Mock GP File
              </button>
              <button type="button" className="ghost-button" onClick={loadMockInvalidFile}>
                Load Invalid File
              </button>
            </div>
          ) : null}
        </div>
        <FileDropzone onFileSelected={(file) => void reader.openFile(file)} isLoading={state.status === 'loading'} />
      </header>

      {state.error ? <ErrorBanner error={state.error} onDismiss={reader.clearError} /> : null}

      <main className="layout-grid">
        <aside className="sidebar">
          <SessionMetadata session={state.session} fileName={state.fileName} />

          <TrackSelector
            tracks={state.session?.tracks ?? []}
            selectedTrackId={state.selectedTrackId}
            trackVolumes={state.trackVolumes}
            onSelect={reader.selectTrack}
            onTrackVolumeChange={reader.setTrackVolume}
          />

          <TransportControls
            key={`${state.fileName ?? 'empty'}:${state.loopRange?.startBar ?? 'none'}:${state.loopRange?.endBar ?? 'none'}`}
            disabled={!state.session}
            isPlaying={state.isPlaying}
            isAutoscrollEnabled={state.isAutoscrollEnabled}
            pitchShiftSemitones={state.pitchShiftSemitones}
            tempoPercent={state.tempoPercent}
            volumePercent={state.volumePercent}
            loopRange={state.loopRange}
            totalBars={state.session?.length.bars ?? 0}
            currentBar={state.position?.barIndex !== undefined ? state.position.barIndex + 1 : null}
            onTogglePlayback={reader.togglePlayback}
            onAutoscrollChange={reader.setAutoscrollEnabled}
            onPitchShiftChange={reader.setPitchShiftSemitones}
            onTempoChange={reader.setTempoPercent}
            onVolumeChange={reader.setVolumePercent}
            onLoopChange={reader.setLoopRange}
          />

          <YouTubeSyncPanel
            activeVideoId={activeVideoId}
            hasSession={Boolean(state.session)}
            syncPointCount={state.session?.sync.syncPointCount ?? 0}
            isLoadingPlayer={isVideoLoading}
            playerError={videoError}
            onLoadVideo={(videoId) => {
              setVideoError(null);
              setIsVideoLoading(true);
              setActiveVideoId(videoId);
            }}
            onClearVideo={() => {
              setVideoError(null);
              setIsVideoLoading(false);
              setActiveVideoId(null);
            }}
            onPlayerMount={handlePlayerMount}
          />
        </aside>

        <ScoreViewport
          status={state.status}
          session={state.session}
          progress={state.position?.progress ?? 0}
          currentBar={state.position?.barIndex !== undefined ? state.position.barIndex + 1 : null}
          disabled={!state.session}
          onSeek={reader.seekByProgress}
          onContainerReady={(element) => void reader.attachContainer(element)}
        />
      </main>
    </div>
  );
}
