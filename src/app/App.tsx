import type { TabEngineFactory } from '@domain/tab-engine';
import { ErrorBanner } from '@components/ErrorBanner';
import { FileDropzone } from '@components/FileDropzone';
import { ScoreViewport } from '@components/ScoreViewport';
import { SessionMetadata } from '@components/SessionMetadata';
import { TrackSelector } from '@components/TrackSelector';
import { TransportControls } from '@components/TransportControls';
import { useTabReader } from '@state/useTabReader';
import './App.css';

interface AppProps {
  engineFactory?: TabEngineFactory;
}

export function App({ engineFactory }: AppProps) {
  const reader = useTabReader({ engineFactory });
  const { state } = reader;
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

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="hero__eyebrow">Browser Guitar Pro Reader</p>
          <h1>On-device tablature and notation playback</h1>
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
            tempoPercent={state.tempoPercent}
            volumePercent={state.volumePercent}
            loopRange={state.loopRange}
            totalBars={state.session?.length.bars ?? 0}
            currentBar={state.position?.barIndex !== undefined ? state.position.barIndex + 1 : null}
            onTogglePlayback={reader.togglePlayback}
            onTempoChange={reader.setTempoPercent}
            onVolumeChange={reader.setVolumePercent}
            onLoopChange={reader.setLoopRange}
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
