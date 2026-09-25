import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabEngineFactory } from '@domain/tab-engine';
import { EmptyState } from '@components/EmptyState';
import { ErrorBanner } from '@components/ErrorBanner';
import { ChevronIcon, CloseIcon, JsonIcon, LogoMark, PlayIcon, TracksIcon, UploadIcon } from '@components/Icons';
import { Popover } from '@components/Popover';
import { ScoreViewport } from '@components/ScoreViewport';
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
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isRailOpen, setIsRailOpen] = useState(
    () => typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 900px)').matches
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const gpInputRef = useRef<HTMLInputElement | null>(null);
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

  const isBusy = state.status === 'loading';
  const hasSession = Boolean(state.session);
  const currentBar = state.position?.barIndex !== undefined ? state.position.barIndex + 1 : null;

  const openBundledSong = () => {
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
  };

  const openDroppedFiles = (files: File[]) => {
    if (files.length === 0) return;
    if (files.every((file) => file.name.toLowerCase().endsWith('.json'))) {
      void reader.openSongsterrFiles(files);
    } else {
      void reader.openFile(files[0]);
    }
  };

  const { togglePlayback } = reader;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !hasSession || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      event.preventDefault();
      togglePlayback();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasSession, togglePlayback]);

  return (
    <div
      className={`app${isRailOpen ? ' rail-open' : ''}`}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setIsDragging(false);
        if (!isBusy) openDroppedFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <header className="topbar">
        <div className="topbar__brand">
          <button
            type="button"
            className={`icon-button topbar__rail-toggle${isRailOpen ? ' is-active' : ''}`}
            aria-label={isRailOpen ? 'Hide tracks' : 'Show tracks'}
            aria-pressed={isRailOpen}
            onClick={() => setIsRailOpen((open) => !open)}
          >
            <TracksIcon size={20} />
          </button>
          <span className="topbar__logo" aria-hidden="true">
            <LogoMark size={20} />
          </span>
          <span className="topbar__name">GP Reader</span>
        </div>

        <div className="topbar__song">
          {state.session ? (
            <>
              <span className="topbar__title">{state.session.meta.title ?? state.fileName ?? 'Untitled'}</span>
              {state.session.meta.artist ? <span className="topbar__artist">{state.session.meta.artist}</span> : null}
            </>
          ) : null}
        </div>

        <div className="topbar__actions">
          {hasSession ? (
            <Popover
              triggerLabel="Open a song"
              triggerClassName="button button--ghost"
              placement="bottom"
              align="end"
              disabled={isBusy}
              trigger={
                <>
                  <UploadIcon size={17} />
                  <span>Open</span>
                  <ChevronIcon size={15} />
                </>
              }
            >
              <div className="menu" role="menu">
                <button type="button" role="menuitem" className="menu__item" onClick={() => gpInputRef.current?.click()}>
                  <UploadIcon size={18} />
                  <span>
                    <strong>Guitar Pro file</strong>
                    <small>.gp .gpx .gp3 – .gp8</small>
                  </span>
                </button>
                <button type="button" role="menuitem" className="menu__item" onClick={() => songJsonInputRef.current?.click()}>
                  <JsonIcon size={18} />
                  <span>
                    <strong>Song JSON files</strong>
                    <small>All track files from one song</small>
                  </span>
                </button>
                <button type="button" role="menuitem" className="menu__item" disabled={isBundledSongLoading} onClick={openBundledSong}>
                  <PlayIcon size={18} />
                  <span>
                    <strong>Demo: Silhouette</strong>
                    <small>Malevolence · bundled song_data</small>
                  </span>
                </button>
              </div>
            </Popover>
          ) : null}
        </div>
      </header>

      <input
        ref={gpInputRef}
        className="visually-hidden-input"
        type="file"
        accept=".gp,.gpx,.gp3,.gp4,.gp5,.gp6,.gp7,.gp8"
        aria-label="Drop Guitar Pro files here or choose from device"
        disabled={isBusy}
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void reader.openFile(file);
        }}
      />
      <input
        ref={songJsonInputRef}
        className="visually-hidden-input"
        type="file"
        accept=".json,application/json"
        multiple
        aria-label="Song JSON track files"
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (files.length > 0) void reader.openSongsterrFiles(files);
        }}
      />

      <div className="workspace">
        <TrackSelector
          session={state.session}
          fileName={state.fileName}
          tracks={state.session?.tracks ?? []}
          selectedTrackId={state.selectedTrackId}
          trackVolumes={state.trackVolumes}
          onSelect={reader.selectTrack}
          onTrackVolumeChange={reader.setTrackVolume}
          isOpen={isRailOpen}
          onClose={() => setIsRailOpen(false)}
        />
        <button
          type="button"
          className="rail-scrim"
          aria-label="Close tracks"
          tabIndex={-1}
          onClick={() => setIsRailOpen(false)}
        />

        <div className="stage">
          {state.error || (bundledSongError && hasSession) ? (
            <div className="toasts">
              {state.error ? <ErrorBanner error={state.error} onDismiss={reader.clearError} /> : null}
              {bundledSongError && hasSession ? (
                <section className="error-banner" role="alert">
                  <span className="error-banner__dot" aria-hidden="true" />
                  <div className="error-banner__content">
                    <strong>demo song unavailable</strong>
                    <p>{bundledSongError}</p>
                  </div>
                  <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setBundledSongError(null)}>
                    <CloseIcon size={16} />
                  </button>
                </section>
              ) : null}
            </div>
          ) : null}

          <ScoreViewport
            status={state.status}
            hasSession={hasSession}
            onContainerReady={(element) => void reader.attachContainer(element)}
            emptyState={
              <EmptyState
                disabled={isBusy}
                isDemoLoading={isBundledSongLoading}
                demoError={bundledSongError}
                onOpenDemo={openBundledSong}
                onPickGuitarPro={() => gpInputRef.current?.click()}
                onPickSongJson={() => songJsonInputRef.current?.click()}
              >
                {mockModeEnabled ? (
                  <div className="empty-state__test-controls" aria-label="Mock test controls">
                    <button type="button" className="button button--ghost" onClick={loadMockValidFile}>
                      Load Mock GP File
                    </button>
                    <button type="button" className="button button--ghost" onClick={loadMockInvalidFile}>
                      Load Invalid File
                    </button>
                  </div>
                ) : null}
              </EmptyState>
            }
          />

          <YouTubeSyncPanel
            isOpen={isVideoOpen}
            onClose={() => setIsVideoOpen(false)}
            activeVideoId={activeVideoId}
            hasSession={hasSession}
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
        </div>
      </div>

      <TransportControls
        key={`${state.fileName ?? 'empty'}:${state.session?.length.bars ?? 0}:${state.loopRange?.startBar ?? 'none'}:${state.loopRange?.endBar ?? 'none'}`}
        disabled={!hasSession}
        isPlaying={state.isPlaying}
        isAutoscrollEnabled={state.isAutoscrollEnabled}
        pitchShiftSemitones={state.pitchShiftSemitones}
        tempoPercent={state.tempoPercent}
        volumePercent={state.volumePercent}
        loopRange={state.loopRange}
        totalBars={state.session?.length.bars ?? 0}
        currentBar={currentBar}
        progress={state.position?.progress ?? 0}
        currentTimeMs={state.position?.currentTimeMs}
        endTimeMs={state.position?.endTimeMs ?? state.session?.length.durationMs}
        isVideoOpen={isVideoOpen}
        hasVideo={Boolean(activeVideoId)}
        onTogglePlayback={reader.togglePlayback}
        onAutoscrollChange={reader.setAutoscrollEnabled}
        onPitchShiftChange={reader.setPitchShiftSemitones}
        onTempoChange={reader.setTempoPercent}
        onVolumeChange={reader.setVolumePercent}
        onLoopChange={reader.setLoopRange}
        onSeek={reader.seekByProgress}
        onToggleVideo={() => setIsVideoOpen((open) => !open)}
      />

      {isDragging ? (
        <div className="drop-overlay" aria-hidden="true">
          <div className="drop-overlay__card">
            <UploadIcon size={30} />
            <strong>Drop to open</strong>
            <span>Guitar Pro file or song JSON track files</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
