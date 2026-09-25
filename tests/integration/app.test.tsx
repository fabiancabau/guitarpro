import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import type { ExternalMediaHandler, LoopRange, ScoreSession, TabEngine, TabEngineCallbacks } from '@domain/index';
import type { CreateYouTubeMediaOptions, YouTubeMediaHandle } from '@lib/youtube';

class FakeEngine implements TabEngine {
  callbacks: TabEngineCallbacks = {};
  selectedTrack: string | null = null;
  lastAutoscroll = true;
  lastPitchShift = 0;
  lastTempo = 100;
  lastVolume = 100;
  lastTrackVolume: { trackId: string; volumePercent: number } | null = null;
  lastLoop: LoopRange | null = null;
  externalMediaHandler: ExternalMediaHandler | null = null;
  externalMediaPosition = 0;
  loadedSongTrackCount = 0;

  setCallbacks(callbacks: TabEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  attach(container: HTMLElement): Promise<void> {
    void container;
    return Promise.resolve();
  }

  load(buffer: ArrayBuffer): Promise<ScoreSession> {
    void buffer;
    const session: ScoreSession = {
      meta: { title: 'Integration Song', artist: 'QA Artist', tempo: 120 },
      tracks: [
        { id: '0', name: 'Lead', volumePercent: 75 },
        { id: '1', name: 'Rhythm', volumePercent: 60 }
      ],
      length: { bars: 16, durationTicks: 16_000 },
      sync: { syncPointCount: 2 }
    };

    this.callbacks.onReady?.(session);
    return Promise.resolve(session);
  }

  loadSongsterrJson(tracks: unknown[]): Promise<ScoreSession> {
    this.loadedSongTrackCount = tracks.length;
    return this.load(new ArrayBuffer(0));
  }

  play(): void {
    this.callbacks.onPlaybackStateChange?.(true);
  }

  pause(): void {
    this.callbacks.onPlaybackStateChange?.(false);
  }

  seek(_ticksOrMs: number): void {
    void _ticksOrMs;
    this.callbacks.onPositionChange?.({
      currentTick: 8_000,
      endTick: 16_000,
      progress: 0.5,
      barIndex: 8,
      beatIndex: 0
    });
  }

  setAutoscroll(enabled: boolean): void {
    this.lastAutoscroll = enabled;
  }

  setPitchShift(semitones: number): void {
    this.lastPitchShift = semitones;
  }

  setTempo(percent: number): void {
    this.lastTempo = percent;
  }

  setVolume(percent: number): void {
    this.lastVolume = percent;
  }

  setTrackVolume(trackId: string, percent: number): void {
    this.lastTrackVolume = { trackId, volumePercent: percent };
  }

  setLoop(range: LoopRange | null): void {
    this.lastLoop = range;
  }

  selectTrack(trackId: string): void {
    this.selectedTrack = trackId;
  }

  setExternalMediaHandler(handler: ExternalMediaHandler | null): void {
    this.externalMediaHandler = handler;
  }

  updateExternalMediaPosition(currentTimeMs: number): void {
    this.externalMediaPosition = currentTimeMs;
  }

  destroy(): void {
    return;
  }
}

describe('App integration', () => {
  it('loads the bundled song JSON through the local score engine', async () => {
    const engine = new FakeEngine();
    const user = userEvent.setup();

    render(<App engineFactory={() => engine} />);
    await user.click(screen.getByRole('button', { name: /open silhouette from song_data/i }));

    expect(await screen.findByText(/Integration Song/i)).toBeInTheDocument();
    expect(engine.loadedSongTrackCount).toBe(7);
    expect(engine.selectedTrack).toBe('1');
  });

  it('reports invalid imported song JSON', async () => {
    const user = userEvent.setup();
    render(<App engineFactory={() => new FakeEngine()} />);

    await user.upload(screen.getByLabelText('Song JSON track files'), new File(['{bad'], 'bad.json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('bad.json is not valid JSON');
  });

  it('loads a valid file and shows parsed metadata', async () => {
    const engine = new FakeEngine();
    const user = userEvent.setup();

    render(<App engineFactory={() => engine} />);

    const input = screen.getByLabelText(/drop guitar pro files here/i);
    const file = new File(['mock'], 'demo.gp5', { type: 'application/octet-stream' });

    await user.upload(input, file);

    expect(await screen.findByText(/Integration Song/i)).toBeInTheDocument();
    expect(screen.getByText(/Tracks:/i)).toBeInTheDocument();
    expect(engine.selectedTrack).toBe('0');
    expect(screen.getByLabelText(/volume \(30%\)/i)).toBeInTheDocument();
  });

  it('rejects unsupported file extensions with user-facing error', async () => {
    const engine = new FakeEngine();
    const user = userEvent.setup({ applyAccept: false });

    render(<App engineFactory={() => engine} />);

    const input = screen.getByLabelText(/drop guitar pro files here/i);
    await user.upload(input, new File(['bad'], 'notes.txt', { type: 'text/plain' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unsupported file format/i);
  });

  it('sends playback and control actions to the engine', async () => {
    const engine = new FakeEngine();
    const user = userEvent.setup();

    render(<App engineFactory={() => engine} />);

    const input = screen.getByLabelText(/drop guitar pro files here/i);
    await user.upload(input, new File(['mock'], 'demo.gp5', { type: 'application/octet-stream' }));

    const playButton = await screen.findByRole('button', { name: 'Play' });
    await user.click(playButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    const tempoSlider = screen.getByLabelText(/tempo \(/i);
    fireEvent.change(tempoSlider, { target: { value: '140' } });

    const playbackControls = screen.getByRole('region', { name: 'Playback controls' });
    const pitchSlider = within(playbackControls).getByLabelText(/pitch \(/i);
    fireEvent.change(pitchSlider, { target: { value: '5' } });
    const volumeSlider = within(playbackControls).getByLabelText(/volume \(30%\)/i);
    fireEvent.change(volumeSlider, { target: { value: '55' } });
    await user.click(within(playbackControls).getByLabelText(/autoscroll playhead/i));

    const leadTrackVolume = screen.getByLabelText('Lead volume');
    fireEvent.change(leadTrackVolume, { target: { value: '42' } });

    const timeline = screen.getByLabelText('Playback timeline');
    fireEvent.change(timeline, { target: { value: '500' } });

    expect(engine.lastTempo).toBeGreaterThan(0);
    expect(engine.lastAutoscroll).toBe(false);
    expect(engine.lastPitchShift).toBe(5);
    expect(engine.lastVolume).toBe(55);
    expect(engine.lastTrackVolume).toEqual({ trackId: '0', volumePercent: 42 });
  });

  it('loads a YouTube video and connects the external media handler', async () => {
    const engine = new FakeEngine();
    const user = userEvent.setup();

    const youtubeMediaFactory = vi.fn<(options: CreateYouTubeMediaOptions) => Promise<YouTubeMediaHandle>>(
      async ({ onPositionChange }) => {
        const handler: ExternalMediaHandler = {
          backingTrackDuration: 90_000,
          playbackRate: 1,
          masterVolume: 1,
          seekTo: vi.fn(),
          play: vi.fn(),
          pause: vi.fn()
        };

        onPositionChange(12_345);

        return {
          handler,
          destroy: vi.fn()
        };
      }
    );

    render(<App engineFactory={() => engine} youtubeMediaFactory={youtubeMediaFactory} />);

    const input = screen.getByLabelText(/drop guitar pro files here/i);
    await user.upload(input, new File(['mock'], 'demo.gp5', { type: 'application/octet-stream' }));

    await user.type(screen.getByLabelText(/youtube url or id/i), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: /load video/i }));

    await waitFor(() => {
      expect(youtubeMediaFactory).toHaveBeenCalled();
      expect(engine.externalMediaHandler).not.toBeNull();
      expect(engine.externalMediaPosition).toBe(12_345);
    });

    expect(screen.getByText(/2 sync points detected/i)).toBeInTheDocument();
  });
});
