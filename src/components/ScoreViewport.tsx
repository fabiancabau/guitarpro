import { useCallback, type ReactNode } from 'react';

interface ScoreViewportProps {
  status: 'idle' | 'loading' | 'ready' | 'error';
  hasSession: boolean;
  emptyState: ReactNode;
  onContainerReady: (element: HTMLElement) => void;
}

export function ScoreViewport({ status, hasSession, emptyState, onContainerReady }: ScoreViewportProps) {
  const mountRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        onContainerReady(node);
      }
    },
    [onContainerReady]
  );

  return (
    <main className={`score-viewport${hasSession ? ' has-session' : ''}`}>
      {/* alphaTab scrolls the engine's parent element, so the canvas must stay its direct parent. */}
      <div className="score-viewport__canvas">
        <div className="score-viewport__engine" ref={mountRef} />
      </div>
      {!hasSession && status !== 'loading' ? <div className="score-viewport__empty">{emptyState}</div> : null}
      {status === 'loading' ? (
        <div className="score-viewport__loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Parsing and rendering score…</span>
        </div>
      ) : null}
    </main>
  );
}
