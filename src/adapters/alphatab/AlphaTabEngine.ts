import type {
  ExternalMediaHandler,
  LoopRange,
  PlaybackPosition,
  ScoreMeta,
  ScoreSession,
  ScoreTrack,
  TabEngine,
  TabEngineCallbacks
} from '@domain/index';
import { ReaderEngineError } from '@domain/errors';
import { mapEngineError } from '@lib/errorMapping';
import { clampPitchShiftSemitones, clampTempoPercent, normalizeProgress, normalizeLoopRange } from '@lib/playback';

type UnknownRecord = Record<string, unknown>;

type EventEmitterLike<T = unknown> = {
  on: (callback: (arg: T) => void) => (() => void) | void;
};

type PlaybackRangeLike = {
  startTick: number;
  endTick: number;
};

type AlphaTabSettingsLike = {
  player: {
    scrollElement: string | HTMLElement;
    scrollMode: number;
    playerMode?: number;
  };
};

type AlphaSynthOutputLike = {
  handler?: ExternalMediaHandler | undefined;
  updatePosition?: (currentTimeMs: number) => void;
};

type AlphaSynthLike = {
  output?: AlphaSynthOutputLike;
};

type AlphaTabApiLike = {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  renderScore: (score: unknown, trackIndexes?: number[]) => void;
  loadMidiForScore?: () => void;
  destroy: () => void;
  play: () => boolean;
  pause: () => void;
  playPause: () => void;
  updateSettings?: () => void;
  changeTrackVolume?: (tracks: number[] | number, volume: number) => void;
  changeTrackTranspositionPitch?: (tracks: unknown[], semitones: number) => void;
  renderTracks: (tracks: unknown[]) => void;
  score: UnknownRecord | null;
  settings: AlphaTabSettingsLike;
  tickPosition: number;
  playbackRange: PlaybackRangeLike | null;
  isLooping: boolean;
  playbackSpeed: number;
  masterVolume: number;
  playerState?: number | string;
  player: AlphaSynthLike | null;
  scoreLoaded: EventEmitterLike<UnknownRecord>;
  renderFinished: EventEmitterLike<unknown>;
  playerPositionChanged: EventEmitterLike<UnknownRecord>;
  playerStateChanged: EventEmitterLike<UnknownRecord>;
  error: EventEmitterLike<Error>;
};

type ScrollModeLike = {
  Off: number;
  Continuous: number;
};

type AlphaTabModuleLike = {
  AlphaTabApi?: new (container: HTMLElement, settings: UnknownRecord) => AlphaTabApiLike;
  ScrollMode?: ScrollModeLike;
  PlayerMode?: {
    EnabledAutomatic: number;
    EnabledExternalMedia: number;
  };
};

const LOAD_TIMEOUT_MS = 15_000;

export class AlphaTabEngine implements TabEngine {
  private api: AlphaTabApiLike | null = null;
  private callbacks: TabEngineCallbacks = {};
  private session: ScoreSession | null = null;
  private barStartTicks: number[] = [];
  private container: HTMLElement | null = null;
  private attachPromise: Promise<void> | null = null;
  private isAutoscrollEnabled = true;
  private pitchShiftSemitones = 0;
  private unsubscribeHandlers: Array<() => void> = [];
  private pendingTrackId: string | null = null;
  private hasRenderedScore = false;
  private externalMediaHandler: ExternalMediaHandler | null = null;
  private tempoPercent = 100;
  private volumePercent = 100;
  private loopRange: LoopRange | null = null;
  private trackVolumes = new Map<string, number>();
  private playerMode = {
    EnabledAutomatic: 1,
    EnabledExternalMedia: 4
  };
  private scrollMode = {
    Off: 0,
    Continuous: 1
  };

  setCallbacks(callbacks: TabEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  attach(container: HTMLElement): Promise<void> {
    if (this.api && this.container === container) {
      return Promise.resolve();
    }

    if (this.attachPromise && this.container === container) {
      return this.attachPromise;
    }

    if (this.container && this.container !== container) {
      this.destroy();
    }

    this.container = container;
    const pending = (async () => {
      const module = (await import('@coderline/alphatab')) as unknown as AlphaTabModuleLike;
      if (this.container !== container) return;
      if (!module.AlphaTabApi) {
        throw new ReaderEngineError('ASSET_LOAD_FAILED', 'alphaTab constructor is unavailable.');
      }
      this.scrollMode = module.ScrollMode ?? this.scrollMode;
      this.playerMode = module.PlayerMode ?? this.playerMode;
      this.api = new module.AlphaTabApi(container, this.buildSettings(container));
      this.applyAutoscrollSetting(this.api);
      this.bindCoreEvents();
    })();
    this.attachPromise = pending;
    const clear = () => {
      if (this.attachPromise === pending) this.attachPromise = null;
    };
    pending.then(clear, clear);
    return pending;
  }

  async load(buffer: ArrayBuffer): Promise<ScoreSession> {
    return this.loadSource((api) => this.awaitLoad(api, () => api.load(new Uint8Array(buffer))));
  }

  async loadSongsterrJson(tracks: unknown[], metadata: ScoreMeta = {}): Promise<ScoreSession> {
    return this.loadSource(async (api) => {
      const { parseSongsterrJson } = await import('@lib/songsterrJson');
      const score = parseSongsterrJson(tracks, metadata);
      return this.awaitLoad(api, () => api.renderScore(score));
    });
  }

  private async loadSource(start: (api: AlphaTabApiLike) => Promise<ScoreSession>): Promise<ScoreSession> {
    await this.attachPromise;
    const api = this.requireApi();
    this.hasRenderedScore = false;
    this.pendingTrackId = null;
    this.loopRange = null;
    this.trackVolumes.clear();

    try {
      const session = await start(api);
      this.session = session;
      this.applyPitchShift(api);
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

  setAutoscroll(enabled: boolean): void {
    this.isAutoscrollEnabled = enabled;

    if (this.api) {
      this.applyAutoscrollSetting(this.api);
    }
  }

  setPitchShift(semitones: number): void {
    this.pitchShiftSemitones = clampPitchShiftSemitones(semitones);

    if (this.api) {
      this.applyPitchShift(this.api);
    }
  }

  setTempo(percent: number): void {
    this.tempoPercent = clampTempoPercent(percent);
    const api = this.requireApi();
    api.playbackSpeed = this.tempoPercent / 100;
  }

  setVolume(percent: number): void {
    this.volumePercent = this.normalizeVolumePercent(percent);
    const api = this.requireApi();
    api.masterVolume = this.volumePercent / 100;
  }

  setTrackVolume(trackId: string, percent: number): void {
    const normalizedPercent = this.normalizeVolumePercent(percent);
    this.trackVolumes.set(trackId, normalizedPercent);
    const api = this.requireApi();
    const trackIndex = Number.parseInt(trackId, 10);

    if (!Number.isFinite(trackIndex) || typeof api.changeTrackVolume !== 'function') {
      return;
    }

    api.changeTrackVolume(trackIndex, this.normalizeTrackVolumePercent(normalizedPercent));
  }

  setLoop(range: LoopRange | null): void {
    const api = this.requireApi();

    if (!this.session) {
      this.loopRange = null;
      return;
    }

    const normalized = normalizeLoopRange(range, this.session.length.bars);
    this.loopRange = normalized;

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
    this.pendingTrackId = trackId;
    const api = this.requireApi();

    if (!this.hasRenderedScore) {
      return;
    }

    this.renderTrackById(api, trackId);
  }

  setExternalMediaHandler(handler: ExternalMediaHandler | null): void {
    this.externalMediaHandler = handler;

    if (this.api) {
      this.applyExternalMediaMode(this.api);
    }
  }

  updateExternalMediaPosition(currentTimeMs: number): void {
    const output = this.api?.player?.output;

    if (typeof output?.updatePosition === 'function') {
      output.updatePosition(Math.max(0, Math.round(currentTimeMs)));
    }
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
    this.attachPromise = null;
    this.session = null;
    this.barStartTicks = [];
    this.container = null;
    this.pendingTrackId = null;
    this.hasRenderedScore = false;
    this.trackVolumes.clear();
  }

  private requireApi(): AlphaTabApiLike {
    if (!this.api) {
      throw new ReaderEngineError('ASSET_LOAD_FAILED', 'Renderer is not attached yet.');
    }

    return this.api;
  }

  private buildSettings(container: HTMLElement): UnknownRecord {
    const scrollContainer = container.parentElement ?? container;

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
        scrollElement: scrollContainer,
        scrollMode: this.resolveScrollMode(),
        playerMode: this.externalMediaHandler
          ? this.playerMode.EnabledExternalMedia
          : this.playerMode.EnabledAutomatic,
        enableCursor: true,
        enableAnimatedBeatCursor: true,
        enableElementHighlighting: true,
        enableUserInteraction: true
      }
    };
  }

  private applyAutoscrollSetting(api: AlphaTabApiLike, updateSettings = true): void {
    api.settings.player.scrollElement = this.container?.parentElement ?? this.container ?? api.settings.player.scrollElement;
    api.settings.player.scrollMode = this.resolveScrollMode();

    if (updateSettings) {
      api.updateSettings?.();
    }
  }

  private applyPitchShift(api: AlphaTabApiLike): void {
    if (!api.score || !Array.isArray(api.score.tracks) || typeof api.changeTrackTranspositionPitch !== 'function') {
      return;
    }

    api.changeTrackTranspositionPitch(api.score.tracks, this.pitchShiftSemitones);
  }

  private applyExternalMediaMode(api: AlphaTabApiLike): void {
    const expectedMode = this.externalMediaHandler
      ? this.playerMode.EnabledExternalMedia
      : this.playerMode.EnabledAutomatic;

    const currentMode = api.settings.player.playerMode;
    const currentTick = api.tickPosition;
    const wasPlaying = this.resolvePlayingState({ state: api.playerState });

    if (currentMode !== expectedMode) {
      api.settings.player.playerMode = expectedMode;
      api.updateSettings?.();

      if (api.score && typeof api.loadMidiForScore === 'function') {
        api.loadMidiForScore();
      }
    }

    const output = api.player?.output;
    if (output) {
      output.handler = this.externalMediaHandler ?? undefined;
    }

    this.restorePlaybackConfiguration(api, currentTick);

    if (wasPlaying) {
      api.play();
    }
  }

  private restorePlaybackConfiguration(api: AlphaTabApiLike, currentTick: number): void {
    this.applyAutoscrollSetting(api, false);
    this.applyPitchShift(api);
    api.playbackSpeed = this.tempoPercent / 100;
    api.masterVolume = this.volumePercent / 100;

    if (this.loopRange && this.session) {
      api.playbackRange = {
        startTick: this.barToTick(this.loopRange.startBar),
        endTick: this.barToTick(this.loopRange.endBar + 1)
      };
      api.isLooping = true;
    } else {
      api.playbackRange = null;
      api.isLooping = false;
    }

    for (const [trackId, volumePercent] of this.trackVolumes) {
      const trackIndex = Number.parseInt(trackId, 10);
      if (Number.isFinite(trackIndex) && typeof api.changeTrackVolume === 'function') {
        api.changeTrackVolume(trackIndex, this.normalizeTrackVolumePercent(volumePercent));
      }
    }

    if (currentTick > 0) {
      api.tickPosition = currentTick;
    }
  }

  private resolveScrollMode(): number {
    return this.isAutoscrollEnabled ? this.scrollMode.Continuous : this.scrollMode.Off;
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

  private awaitLoad(api: AlphaTabApiLike, start: () => boolean | void): Promise<ScoreSession> {
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

      let started: boolean | void;
      try {
        started = start();
      } catch (error) {
        finish(() => reject(error));
        return;
      }
      if (started === false) {
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
      },
      sync: {
        syncPointCount: masterBarsRaw.reduce((count, bar) => {
          const syncPoints = Array.isArray((bar as UnknownRecord).syncPoints)
            ? ((bar as UnknownRecord).syncPoints as unknown[])
            : [];

          return count + syncPoints.length;
        }, 0)
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
