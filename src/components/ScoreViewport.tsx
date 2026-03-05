import { useCallback } from 'react';
import type { ScoreSession } from '@domain/types';

interface ScoreViewportProps {
  status: 'idle' | 'loading' | 'ready' | 'error';
  session: ScoreSession | null;
  progress: number;
  currentBar: number | null;
  disabled: boolean;
  onSeek: (progress: number) => void;
  onContainerReady: (element: HTMLElement) => void;
}

export function ScoreViewport({
  status,
  session,
  progress,
  currentBar,
  disabled,
  onSeek,
  onContainerReady
}: ScoreViewportProps) {
  const mountRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        onContainerReady(node);
      }
    },
    [onContainerReady]
  );

  return (
    <section className="score-viewport">
      <header className="score-viewport__header">
        <h2>{session?.meta.title ?? 'No tab loaded'}</h2>
        <p>{session?.meta.artist ?? 'Open a Guitar Pro file to start.'}</p>
      </header>
      <div className="score-viewport__canvas">
        <div className="score-viewport__timeline">
          <div className="score-viewport__timeline-meta">
            <span>{currentBar ? `Bar ${currentBar}` : 'Bar -'}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <input
            className="score-viewport__timeline-range"
            aria-label="Playback timeline"
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            disabled={disabled}
            onChange={(event) => onSeek(Number(event.currentTarget.value) / 1000)}
          />
        </div>
        <div className="score-viewport__engine" ref={mountRef} />
        {status === 'idle' ? <p className="score-viewport__overlay">Waiting for a file...</p> : null}
        {status === 'loading' ? <p className="score-viewport__overlay">Parsing and rendering score...</p> : null}
      </div>
    </section>
  );
}
