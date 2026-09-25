import type { ReactNode } from 'react';
import { GuitarIcon, JsonIcon, LogoMark, PlayIcon, UploadIcon } from './Icons';

interface EmptyStateProps {
  disabled: boolean;
  isDemoLoading: boolean;
  demoError: string | null;
  onOpenDemo: () => void;
  onPickGuitarPro: () => void;
  onPickSongJson: () => void;
  children?: ReactNode;
}

export function EmptyState({
  disabled,
  isDemoLoading,
  demoError,
  onOpenDemo,
  onPickGuitarPro,
  onPickSongJson,
  children
}: EmptyStateProps) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <div className="empty-state__mark" aria-hidden="true">
        <LogoMark size={30} />
      </div>
      <p className="eyebrow">Guitar Pro Reader</p>
      <h1 id="empty-state-title">On-device tablature and notation playback</h1>
      <p className="empty-state__lede">
        Open a tab, pick a track, and play along. Everything is parsed and rendered right here in your browser.
      </p>

      <button type="button" className="demo-card" disabled={disabled || isDemoLoading} onClick={onOpenDemo}>
        <span className="demo-card__art" aria-hidden="true">
          <GuitarIcon size={26} />
        </span>
        <span className="demo-card__text">
          <span className="demo-card__title">{isDemoLoading ? 'Loading song…' : 'Open Silhouette'}</span>{' '}
          <span className="demo-card__meta">from song_data · Malevolence · 7 tracks</span>
        </span>
        <span className="demo-card__play" aria-hidden="true">
          <PlayIcon size={18} />
        </span>
      </button>
      {demoError ? (
        <p className="empty-state__error" role="alert">
          {demoError}
        </p>
      ) : null}

      <div className="empty-state__actions">
        <button type="button" className="source-card" disabled={disabled} onClick={onPickGuitarPro}>
          <UploadIcon size={20} />
          <span>
            <strong>Guitar Pro file</strong>
            <small>.gp .gpx .gp3 – .gp8</small>
          </span>
        </button>
        <button type="button" className="source-card" disabled={disabled} onClick={onPickSongJson}>
          <JsonIcon size={20} />
          <span>
            <strong>Song JSON files</strong>
            <small>All track files from one song</small>
          </span>
        </button>
      </div>

      <p className="empty-state__hint">…or drop a file anywhere on this window.</p>
      {children}
    </section>
  );
}
