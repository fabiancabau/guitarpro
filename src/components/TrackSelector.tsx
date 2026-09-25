import type { CSSProperties } from 'react';
import type { ScoreSession, ScoreTrack } from '@domain/types';
import { formatTuning, instrumentKind, type InstrumentKind } from '@lib/instruments';
import { BassIcon, CloseIcon, DrumsIcon, GuitarIcon, KeysIcon, VocalsIcon } from './Icons';

interface TrackSelectorProps {
  session: ScoreSession | null;
  fileName: string | null;
  tracks: ScoreTrack[];
  selectedTrackId: string | null;
  onSelect: (trackId: string) => void;
  trackVolumes: Record<string, number>;
  onTrackVolumeChange: (trackId: string, volumePercent: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const KIND_ICONS: Record<InstrumentKind, typeof GuitarIcon> = {
  guitar: GuitarIcon,
  bass: BassIcon,
  drums: DrumsIcon,
  keys: KeysIcon,
  vocals: VocalsIcon
};

export function TrackSelector({
  session,
  fileName,
  tracks,
  selectedTrackId,
  onSelect,
  trackVolumes,
  onTrackVolumeChange,
  isOpen,
  onClose
}: TrackSelectorProps) {
  return (
    <aside className={`track-rail${isOpen ? ' is-open' : ''}`} aria-label="Track mixer">
      <div className="track-rail__header">
        <span className="eyebrow">Tracks</span>
        {tracks.length > 0 ? <span className="track-rail__count">{tracks.length}</span> : null}
        <button type="button" className="icon-button track-rail__close" aria-label="Close tracks" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
      </div>

      {tracks.length === 0 ? <p className="track-rail__empty">Tracks appear here once a song is open.</p> : null}

      <ul className="track-rail__list">
        {tracks.map((track) => {
          const isSelected = selectedTrackId === track.id;
          const volume = trackVolumes[track.id] ?? track.volumePercent ?? 100;
          const kind = instrumentKind(track);
          const Icon = KIND_ICONS[kind];
          const tuning = kind === 'drums' ? null : formatTuning(track.tuning);

          return (
            <li key={track.id} className={`track${isSelected ? ' is-selected' : ''}`} data-kind={kind}>
              <button
                type="button"
                className="track__select"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect(track.id)}
              >
                <span className="track__icon">
                  <Icon size={20} />
                </span>
                <span className="track__text">
                  <span className="track__name">{track.name}</span>
                  <span className="track__meta">
                    <span className="track__kind">{kind}</span>
                    {tuning ? <span className="track__tuning">{tuning}</span> : null}
                  </span>
                </span>
              </button>

              <label className="track__volume" title={`Volume ${volume}%`}>
                <input
                  aria-label={`${track.name} volume`}
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  style={{ '--fill': `${volume}%` } as CSSProperties}
                  onChange={(event) => onTrackVolumeChange(track.id, Number(event.currentTarget.value))}
                />
                <span className="track__volume-value">{volume}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {session ? (
        <dl className="track-rail__stats" aria-label="Loaded tab metadata">
          <div>
            <dt>Bars</dt>
            <dd>{session.length.bars}</dd>
          </div>
          <div>
            <dt>Tempo</dt>
            <dd>{session.meta.tempo ? `${session.meta.tempo} bpm` : 'n/a'}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd title={fileName ?? undefined}>{fileName ?? 'Unknown'}</dd>
          </div>
        </dl>
      ) : null}
    </aside>
  );
}
