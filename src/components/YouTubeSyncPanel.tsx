import { useEffect, useMemo, useState } from 'react';
import { parseYouTubeVideoId } from '@lib/youtube';
import { CloseIcon, VideoIcon } from './Icons';

interface YouTubeSyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeVideoId: string | null;
  hasSession: boolean;
  syncPointCount: number;
  isLoadingPlayer: boolean;
  playerError: string | null;
  onLoadVideo: (videoId: string) => void;
  onClearVideo: () => void;
  onPlayerMount: (element: HTMLElement | null) => void;
}

function syncHint(hasSession: boolean, syncPointCount: number): string {
  if (!hasSession) {
    return 'Load a Guitar Pro file, then add a YouTube URL to sync playback.';
  }

  if (syncPointCount > 0) {
    return `${syncPointCount} sync point${syncPointCount === 1 ? '' : 's'} detected in this tab. Use the app transport for the most reliable sync.`;
  }

  return 'This tab does not expose embedded sync points. The video can load, but alignment will only work if the file was authored with matching timing.';
}

export function YouTubeSyncPanel({
  isOpen,
  onClose,
  activeVideoId,
  hasSession,
  syncPointCount,
  isLoadingPlayer,
  playerError,
  onLoadVideo,
  onClearVideo,
  onPlayerMount
}: YouTubeSyncPanelProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeVideoId) {
      onPlayerMount(null);
    }
  }, [activeVideoId, onPlayerMount]);

  const hint = useMemo(() => syncHint(hasSession, syncPointCount), [hasSession, syncPointCount]);

  return (
    // Kept mounted while closed so a loaded video keeps playing in sync.
    <section className="video-sync" aria-label="YouTube sync" data-open={isOpen}>
      <div className="video-sync__header">
        <span className="video-sync__badge" aria-hidden="true">
          <VideoIcon size={18} />
        </span>
        <div>
          <p className="eyebrow">YouTube sync</p>
          <h2>Play along with a video</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Close YouTube sync" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
      </div>
      <p className="video-sync__hint">{hint}</p>

      <form
        className="video-sync__form"
        onSubmit={(event) => {
          event.preventDefault();
          const videoId = parseYouTubeVideoId(url);

          if (!videoId) {
            setValidationError('Provide a valid YouTube URL or video ID.');
            return;
          }

          setValidationError(null);
          onLoadVideo(videoId);
        }}
      >
        <label className="field">
          <span className="field__label">YouTube URL or ID</span>
          <input
            type="text"
            value={url}
            placeholder="https://www.youtube.com/watch?v=..."
            onChange={(event) => {
              setUrl(event.currentTarget.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
          />
        </label>

        <div className="video-sync__actions">
          <button type="submit" className="button button--accent">
            {activeVideoId ? 'Update video' : 'Load video'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            disabled={!activeVideoId && url.trim().length === 0}
            onClick={() => {
              setUrl('');
              setValidationError(null);
              onClearVideo();
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {validationError ? (
        <p className="video-sync__error" role="alert">
          {validationError}
        </p>
      ) : null}

      {playerError ? (
        <p className="video-sync__error" role="alert">
          {playerError}
        </p>
      ) : null}

      <div className="video-sync__player-shell">
        {activeVideoId ? (
          <>
            <div className="video-sync__player" ref={onPlayerMount} />
            {isLoadingPlayer ? <p className="video-sync__empty">Connecting YouTube player...</p> : null}
          </>
        ) : (
          <p className="video-sync__empty">Add a YouTube URL to load the synced player.</p>
        )}
      </div>
    </section>
  );
}
