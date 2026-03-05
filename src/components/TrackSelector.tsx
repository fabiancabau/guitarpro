import type { ScoreTrack } from '@domain/types';

interface TrackSelectorProps {
  tracks: ScoreTrack[];
  selectedTrackId: string | null;
  onSelect: (trackId: string) => void;
  trackVolumes: Record<string, number>;
  onTrackVolumeChange: (trackId: string, volumePercent: number) => void;
}

export function TrackSelector({
  tracks,
  selectedTrackId,
  onSelect,
  trackVolumes,
  onTrackVolumeChange
}: TrackSelectorProps) {
  return (
    <section className="track-mixer" aria-label="Track mixer">
      <div className="track-mixer__header">
        <span className="control-group__label">Tracks</span>
      </div>
      {tracks.length === 0 ? <p className="track-mixer__empty">No tracks available</p> : null}
      {tracks.map((track) => {
        const isSelected = selectedTrackId === track.id;
        const volume = trackVolumes[track.id] ?? track.volumePercent ?? 100;

        return (
          <div key={track.id} className={`track-mixer__item${isSelected ? ' track-mixer__item--active' : ''}`}>
            <button type="button" className="track-mixer__select" onClick={() => onSelect(track.id)}>
              <span>{track.name}</span>
              {isSelected ? <span className="track-mixer__badge">Visible</span> : null}
            </button>

            <label className="track-mixer__volume">
              <span>Volume ({volume}%)</span>
              <input
                aria-label={`${track.name} volume`}
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(event) => onTrackVolumeChange(track.id, Number(event.currentTarget.value))}
              />
            </label>
          </div>
        );
      })}
    </section>
  );
}
