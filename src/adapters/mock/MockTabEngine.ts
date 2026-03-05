import type {
  LoopRange,
  PlaybackPosition,
  ScoreSession,
  TabEngine,
  TabEngineCallbacks
} from '@domain/index';
import { clampTempoPercent, normalizeLoopRange, normalizeProgress, progressToTicks } from '@lib/playback';

const MOCK_SESSION: ScoreSession = {
  meta: {
    title: 'Mock Song',
    artist: 'Mock Artist',
    album: 'Mock Album',
    tempo: 120
  },
  tracks: [
    { id: '0', name: 'Lead Guitar', volumePercent: 78, tuning: ['E', 'B', 'G', 'D', 'A', 'E'] },
    { id: '1', name: 'Rhythm Guitar', volumePercent: 64, tuning: ['E', 'B', 'G', 'D', 'A', 'E'] }
  ],
  length: {
    bars: 32,
    durationTicks: 32_000,
    durationMs: 120_000
  }
};

export class MockTabEngine implements TabEngine {
  private callbacks: TabEngineCallbacks = {};
  private isPlaying = false;
  private intervalId: number | null = null;
  private currentTick = 0;
  private tempoPercent = 100;
  private volumePercent = 100;
  private trackVolumes = new Map<string, number>(
    MOCK_SESSION.tracks.map((track) => [track.id, track.volumePercent ?? 100])
  );
  private loop: LoopRange | null = null;

  setCallbacks(callbacks: TabEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  attach(container: HTMLElement): Promise<void> {
    container.innerHTML = '<div class="mock-score">Mock score viewport</div>';
    return Promise.resolve();
  }

  load(buffer: ArrayBuffer): Promise<ScoreSession> {
    void buffer;
    this.currentTick = 0;
    this.callbacks.onReady?.(MOCK_SESSION);
    this.callbacks.onPositionChange?.(this.positionPayload());
    return Promise.resolve(MOCK_SESSION);
  }

  play(): void {
    if (this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.callbacks.onPlaybackStateChange?.(true);

    this.intervalId = window.setInterval(() => {
      const totalTicks = MOCK_SESSION.length.durationTicks ?? 0;
      const speedFactor = this.tempoPercent / 100;
      this.currentTick += Math.round(320 * speedFactor);

      if (this.loop) {
        const loopStart = this.barToTick(this.loop.startBar);
        const loopEnd = this.barToTick(this.loop.endBar + 1);
        if (this.currentTick >= loopEnd) {
          this.currentTick = loopStart;
        }
      } else if (this.currentTick >= totalTicks) {
        this.currentTick = totalTicks;
        this.pause();
      }

      this.callbacks.onPositionChange?.(this.positionPayload());
    }, 100);
  }

  pause(): void {
    this.isPlaying = false;
    this.callbacks.onPlaybackStateChange?.(false);

    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  seek(ticksOrMs: number): void {
    this.currentTick = Math.max(0, Math.min(MOCK_SESSION.length.durationTicks ?? 0, Math.round(ticksOrMs)));
    this.callbacks.onPositionChange?.(this.positionPayload());
  }

  setTempo(percent: number): void {
    this.tempoPercent = clampTempoPercent(percent);
  }

  setVolume(percent: number): void {
    this.volumePercent = Math.max(0, Math.min(100, Math.round(percent)));
  }

  setTrackVolume(trackId: string, percent: number): void {
    this.trackVolumes.set(trackId, Math.max(0, Math.min(100, Math.round(percent))));
  }

  setLoop(range: LoopRange | null): void {
    this.loop = normalizeLoopRange(range, MOCK_SESSION.length.bars);
  }

  selectTrack(trackId: string): void {
    void trackId;
    // mock rendering has no per-track visuals.
  }

  destroy(): void {
    void this.volumePercent;
    void this.trackVolumes;
    this.pause();
  }

  private positionPayload(): PlaybackPosition {
    const total = MOCK_SESSION.length.durationTicks ?? 0;
    const barIndex = Math.floor((this.currentTick / total) * MOCK_SESSION.length.bars);

    return {
      currentTick: this.currentTick,
      endTick: total,
      progress: normalizeProgress(total > 0 ? this.currentTick / total : 0),
      barIndex,
      beatIndex: 0
    };
  }

  private barToTick(barNumber: number): number {
    const bars = MOCK_SESSION.length.bars;
    const totalTicks = MOCK_SESSION.length.durationTicks ?? 0;

    return progressToTicks((barNumber - 1) / bars, totalTicks);
  }
}
