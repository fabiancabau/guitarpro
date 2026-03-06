import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import type { LoopRange, ScoreSession, TabEngine, TabEngineCallbacks } from '@domain/index';

class FakeEngine implements TabEngine {
  callbacks: TabEngineCallbacks = {};
  selectedTrack: string | null = null;
  lastAutoscroll = true;
  lastTempo = 100;
  lastVolume = 100;
  lastTrackVolume: { trackId: string; volumePercent: number } | null = null;
  lastLoop: LoopRange | null = null;

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
      length: { bars: 16, durationTicks: 16_000 }
    };

    this.callbacks.onReady?.(session);
    return Promise.resolve(session);
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

  destroy(): void {
    return;
  }
}

describe('App integration', () => {
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
    const volumeSlider = within(playbackControls).getByLabelText(/volume \(30%\)/i);
    fireEvent.change(volumeSlider, { target: { value: '55' } });
    await user.click(within(playbackControls).getByLabelText(/autoscroll playhead/i));

    const leadTrackVolume = screen.getByLabelText('Lead volume');
    fireEvent.change(leadTrackVolume, { target: { value: '42' } });

    const timeline = screen.getByLabelText('Playback timeline');
    fireEvent.change(timeline, { target: { value: '500' } });

    expect(engine.lastTempo).toBeGreaterThan(0);
    expect(engine.lastAutoscroll).toBe(false);
    expect(engine.lastVolume).toBe(55);
    expect(engine.lastTrackVolume).toEqual({ trackId: '0', volumePercent: 42 });
  });
});
