import type {
  LoopRange,
  PlaybackPosition,
  ScoreSession,
  ScoreTrack,
  TabEngine,
  TabEngineCallbacks
} from '@domain/index';
import { ReaderEngineError } from '@domain/errors';
import { mapEngineError } from '@lib/errorMapping';
import { clampTempoPercent, normalizeProgress, normalizeLoopRange } from '@lib/playback';

type UnknownRecord = Record<string, unknown>;

type EventEmitterLike<T = unknown> = {
  on: (callback: (arg: T) => void) => (() => void) | void;
};

type PlaybackRangeLike = {
  startTick: number;
  endTick: number;
};

type AlphaTabApiLike = {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  destroy: () => void;
  play: () => boolean;
  pause: () => void;
  playPause: () => void;
  changeTrackVolume?: (tracks: number[] | number, volume: number) => void;
  renderTracks: (tracks: unknown[]) => void;
  score: UnknownRecord | null;
  tickPosition: number;
  playbackRange: PlaybackRangeLike | null;
  isLooping: boolean;
  playbackSpeed: number;
  masterVolume: number;
  scoreLoaded: EventEmitterLike<UnknownRecord>;
  renderFinished: EventEmitterLike<unknown>;
  playerPositionChanged: EventEmitterLike<UnknownRecord>;
  playerStateChanged: EventEmitterLike<UnknownRecord>;
  error: EventEmitterLike<Error>;
};

type AlphaTabModuleLike = {
  AlphaTabApi?: new (container: HTMLElement, settings: UnknownRecord) => AlphaTabApiLike;
};

const LOAD_TIMEOUT_MS = 15_000;

export class AlphaTabEngine implements TabEngine {
  private api: AlphaTabApiLike | null = null;
  private callbacks: TabEngineCallbacks = {};
  private session: ScoreSession | null = null;
  private barStartTicks: number[] = [];
  private container: HTMLElement | null = null;
  private unsubscribeHandlers: Array<() => void> = [];
  private pendingTrackId: string | null = null;
  private hasRenderedScore = false;

  setCallbacks(callbacks: TabEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  async attach(container: HTMLElement): Promise<void> {
    if (this.api && this.container === container) {
      return;
    }

    if (this.api && this.container !== container) {
      this.destroy();
    }

    const module = (await import('@coderline/alphatab')) as unknown as AlphaTabModuleLike;

    if (!module.AlphaTabApi) {
      throw new ReaderEngineError('ASSET_LOAD_FAILED', 'alphaTab constructor is unavailable.');
    }

    this.container = container;
    this.api = new module.AlphaTabApi(container, this.buildSettings(container));
    this.bindCoreEvents();
  }

  async load(buffer: ArrayBuffer): Promise<ScoreSession> {
    const api = this.requireApi();
    this.hasRenderedScore = false;
    this.pendingTrackId = null;

    try {
      const session = await this.awaitLoad(api, new Uint8Array(buffer));
      this.session = session;
      this.callbacks.onReady?.(session);
      return session;
    } catch (error) {
      const mapped = mapEngineError(error);
      this.callbacks.onError?.(mapped);
      throw mapped;
    }
  }

  play(): void {
    const api = this.requireApi();
    api.play();
  }

  pause(): void {
    const api = this.requireApi();
    api.pause();
  }

  seek(ticksOrMs: number): void {
    const api = this.requireApi();
    api.tickPosition = Math.max(0, Math.round(ticksOrMs));
  }

  setTempo(percent: number): void {
    const api = this.requireApi();
    api.playbackSpeed = clampTempoPercent(percent) / 100;
  }

  setVolume(percent: number): void {
    const api = this.requireApi();
    api.masterVolume = this.normalizeVolumePercent(percent) / 100;
  }

  setTrackVolume(trackId: string, percent: number): void {
    const api = this.requireApi();
    const trackIndex = Number.parseInt(trackId, 10);

    if (!Number.isFinite(trackIndex) || typeof api.changeTrackVolume !== 'function') {
      return;
    }

    api.changeTrackVolume(trackIndex, this.normalizeTrackVolumePercent(percent));
  }

  setLoop(range: LoopRange | null): void {
    const api = this.requireApi();

    if (!this.session) {
      return;
    }

    const normalized = normalizeLoopRange(range, this.session.length.bars);

    if (!normalized) {
      api.playbackRange = null;
      api.isLooping = false;
      return;
    }

    api.playbackRange = {
      startTick: this.barToTick(normalized.startBar),
      endTick: this.barToTick(normalized.endBar + 1)
    };
    api.isLooping = true;
  }

  selectTrack(trackId: string): void {
    const api = this.requireApi();

    if (!this.hasRenderedScore) {
      this.pendingTrackId = trackId;
      return;
    }

    this.renderTrackById(api, trackId);
  }

  private renderTrackById(api: AlphaTabApiLike, trackId: string): void {
    const score = api.score;

    if (!score || !Array.isArray(score.tracks)) {
      return;
    }

    const tracks = score.tracks as UnknownRecord[];

    const selected = tracks.find((track) => {
      const object = track;
      return String(object.index ?? object.id) === trackId;
    });

    if (selected) {
      api.renderTracks([selected]);
      this.pendingTrackId = null;
    }
  }

  destroy(): void {
    for (const off of this.unsubscribeHandlers) {
      off();
    }

    this.unsubscribeHandlers = [];
    this.api?.destroy();
    this.api = null;
    this.session = null;
    this.barStartTicks = [];
    this.pendingTrackId = null;
    this.hasRenderedScore = false;
  }

  private requireApi(): AlphaTabApiLike {
    if (!this.api) {
      throw new ReaderEngineError('ASSET_LOAD_FAILED', 'Renderer is not attached yet.');
    }

    return this.api;
  }

  private buildSettings(container: HTMLElement): UnknownRecord {
    return {
      core: {
        fontDirectory: '/font/'
      },
      display: {
        layoutMode: 'page',
        staveProfile: 'scoretab'
      },
      notation: {
        notationMode: 'guitarpro'
      },
      player: {
        enablePlayer: true,
        soundFont: '/soundfont/sonivox.sf2',
        scrollElement: container,
        enableCursor: true,
        enableAnimatedBeatCursor: true,
        enableElementHighlighting: true,
        enableUserInteraction: true
      }
    };
  }

  private bindCoreEvents(): void {
    const api = this.requireApi();

    const offPosition = this.attachEvent(api.playerPositionChanged, (args) => {
      this.callbacks.onPositionChange?.(this.mapPosition(args));
    });

    const offRenderFinished = this.attachEvent(api.renderFinished, () => {
      this.hasRenderedScore = true;

      if (this.pendingTrackId) {
        const nextTrackId = this.pendingTrackId;
        window.requestAnimationFrame(() => {
          if (this.api && nextTrackId) {
            this.renderTrackById(this.api, nextTrackId);
          }
        });
      }
    });

    const offState = this.attachEvent(api.playerStateChanged, (args) => {
      this.callbacks.onPlaybackStateChange?.(this.resolvePlayingState(args));
    });

    const offError = this.attachEvent(api.error, (error) => {
      this.callbacks.onError?.(mapEngineError(error));
    });

    this.unsubscribeHandlers.push(offPosition, offRenderFinished, offState, offError);
  }

  private awaitLoad(api: AlphaTabApiLike, scoreBytes: Uint8Array): Promise<ScoreSession> {
    return new Promise((resolve, reject) => {
      let completed = false;
      let offLoaded: () => void = () => {};
      let offError: () => void = () => {};

      const finish = (callback: () => void) => {
        if (completed) {
          return;
        }

        completed = true;
        window.clearTimeout(timeoutId);
        offLoaded();
        offError();
        callback();
      };

      offLoaded = this.attachEvent(api.scoreLoaded, (score) => {
        finish(() => {
          resolve(this.mapScore(score));
        });
      });

      offError = this.attachEvent(api.error, (error) => {
        finish(() => {
          reject(error);
        });
      });

      const timeoutId = window.setTimeout(() => {
        finish(() => {
          reject(new ReaderEngineError('PARSE_FAILED', 'Timed out while loading score data.'));
        });
      }, LOAD_TIMEOUT_MS);

      const started = api.load(scoreBytes);
      if (!started) {
        finish(() => {
          reject(new ReaderEngineError('PARSE_FAILED', 'alphaTab could not start loading the score.'));
        });
      }
    });
  }

  private attachEvent<T>(event: EventEmitterLike<T> | undefined, callback: (value: T) => void): () => void {
    if (!event || typeof event.on !== 'function') {
      return () => {};
    }

    const maybeOff = event.on(callback);
    return typeof maybeOff === 'function' ? maybeOff : () => {};
  }

  private mapPosition(payload: UnknownRecord): PlaybackPosition {
    const currentTick = this.toFiniteNumber(payload.currentTick, 0);
    const endTick =
      this.toFiniteNumber(payload.endTick, this.session?.length.durationTicks ?? 0) ||
      (this.session?.length.durationTicks ?? 0);

    return {
      currentTick,
      endTick,
      progress: normalizeProgress(endTick > 0 ? currentTick / endTick : 0),
      barIndex: this.resolveBarIndex(currentTick),
      beatIndex: undefined
    };
  }

  private resolvePlayingState(payload: UnknownRecord): boolean {
    const fromState = payload.state;

    if (typeof fromState === 'number') {
      return fromState === 1;
    }

    if (typeof fromState === 'string') {
      return fromState.toLowerCase() === 'playing';
    }

    return false;
  }

  private mapScore(score: UnknownRecord): ScoreSession {
    const tracksRaw = Array.isArray(score.tracks) ? score.tracks : [];
    const masterBarsRaw = Array.isArray(score.masterBars) ? score.masterBars : [];

    this.barStartTicks = masterBarsRaw
      .map((bar) => this.toFiniteNumber((bar as UnknownRecord).start, 0))
      .sort((a, b) => a - b);

    const tracks = tracksRaw.map((track, index) => this.mapTrack(track as UnknownRecord, index));

    const durationTicks = this.estimateDurationTicks(masterBarsRaw);

    return {
      meta: {
        title: this.toOptionalString(score.title),
        artist: this.toOptionalString(score.artist),
        album: this.toOptionalString(score.album),
        tempo: this.toOptionalNumber(score.tempo)
      },
      tracks,
      length: {
        bars: masterBarsRaw.length,
        durationTicks,
        durationMs: this.toOptionalNumber(score.duration)
      }
    };
  }

  private mapTrack(track: UnknownRecord, index: number): ScoreTrack {
    const rawId = track.index ?? track.id;
    const id =
      typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : String(index);

    const staves = Array.isArray(track.staves) ? (track.staves as UnknownRecord[]) : [];
    const firstStaff = staves[0];
    const tuning = Array.isArray(firstStaff?.tuning)
      ? firstStaff.tuning.map((value) => String(value))
      : undefined;

    const playbackInfo = (track.playbackInfo ?? {}) as UnknownRecord;
    const program = this.toOptionalNumber(playbackInfo.program);

    return {
      id,
      name: this.toOptionalString(track.name) ?? `Track ${index + 1}`,
      volumePercent: this.toTrackVolumePercent(this.toOptionalNumber(playbackInfo.volume)),
      tuning,
      instrument: program !== undefined ? `Program ${program}` : undefined
    };
  }

  private estimateDurationTicks(masterBars: unknown[]): number {
    if (masterBars.length === 0) {
      return 0;
    }

    const lastBar = masterBars[masterBars.length - 1] as UnknownRecord;
    const startTick = this.toFiniteNumber(lastBar.start, 0);

    const durationFromFn =
      typeof lastBar.calculateDuration === 'function'
        ? this.toFiniteNumber((lastBar.calculateDuration as () => unknown)(), 0)
        : 0;

    const duration = durationFromFn > 0 ? durationFromFn : this.toFiniteNumber(lastBar.length, 0);
    return Math.max(0, Math.round(startTick + duration));
  }

  private resolveBarIndex(currentTick: number): number | undefined {
    if (this.barStartTicks.length === 0) {
      return undefined;
    }

    for (let index = this.barStartTicks.length - 1; index >= 0; index -= 1) {
      const start = this.barStartTicks[index] ?? 0;
      if (currentTick >= start) {
        return index;
      }
    }

    return 0;
  }

  private barToTick(barNumber: number): number {
    const index = Math.max(0, barNumber - 1);

    if (index < this.barStartTicks.length) {
      return this.barStartTicks[index] ?? 0;
    }

    if (this.session?.length.durationTicks && this.session.length.bars > 0) {
      const ticksPerBar = this.session.length.durationTicks / this.session.length.bars;
      return Math.round(index * ticksPerBar);
    }

    return 0;
  }

  private toFiniteNumber(value: unknown, fallback: number | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback ?? 0;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeVolumePercent(percent: number): number {
    if (!Number.isFinite(percent)) {
      return 100;
    }

    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  private normalizeTrackVolumePercent(percent: number): number {
    const normalized = this.normalizeVolumePercent(percent);
    return Math.max(0, Math.min(16, Math.round((normalized / 100) * 16)));
  }

  private toTrackVolumePercent(volume: number | undefined): number {
    if (volume === undefined) {
      return 100;
    }

    return this.normalizeVolumePercent((volume / 16) * 100);
  }
}
