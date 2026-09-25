import type { ExternalMediaHandler } from '@domain/types';

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_POLL_INTERVAL_MS = 100;

type YouTubePlayerStateMap = {
  PLAYING: number;
  PAUSED: number;
  BUFFERING: number;
  ENDED: number;
};

type YouTubePlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  getAvailablePlaybackRates?: () => number[];
  setVolume: (volume: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
};

type YouTubePlayerNamespace = {
  Player: new (
    element: HTMLElement,
    config: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: YouTubePlayerStateMap;
};

type YouTubeWindow = Window &
  typeof globalThis & {
    YT?: YouTubePlayerNamespace;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  };

export interface YouTubeMediaHandle {
  handler: ExternalMediaHandler;
  destroy(): void;
}

export interface CreateYouTubeMediaOptions {
  container: HTMLElement;
  videoId: string;
  onPositionChange: (currentTimeMs: number) => void;
}

let youtubeIframeApiPromise: Promise<YouTubePlayerNamespace> | null = null;

function pathSegmentAt(pathname: string, index: number): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const value = parts[index];
  return value && YOUTUBE_ID_PATTERN.test(value) ? value : null;
}

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    return pathSegmentAt(url.pathname, 0);
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const watchId = url.searchParams.get('v');
    if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) {
      return watchId;
    }

    return pathSegmentAt(url.pathname, 1) ?? pathSegmentAt(url.pathname, 0);
  }

  return null;
}

function getYouTubeWindow(): YouTubeWindow {
  return window as YouTubeWindow;
}

function clampUnitInterval(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function pickSupportedPlaybackRate(player: YouTubePlayer, desiredRate: number): number {
  const requestedRate = Number.isFinite(desiredRate) && desiredRate > 0 ? desiredRate : 1;
  const availableRates = player.getAvailablePlaybackRates?.() ?? [];

  if (availableRates.length === 0) {
    return requestedRate;
  }

  return availableRates.reduce((closest, rate) => {
    return Math.abs(rate - requestedRate) < Math.abs(closest - requestedRate) ? rate : closest;
  }, availableRates[0] ?? 1);
}

function loadYouTubeIframeApi(): Promise<YouTubePlayerNamespace> {
  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise<YouTubePlayerNamespace>((resolve, reject) => {
    const youtubeWindow = getYouTubeWindow();

    if (youtubeWindow.YT?.Player) {
      resolve(youtubeWindow.YT);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-youtube-iframe-api="true"]');
    const previousReadyCallback = youtubeWindow.onYouTubeIframeAPIReady;

    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.();

      if (youtubeWindow.YT?.Player) {
        resolve(youtubeWindow.YT);
        return;
      }

      reject(new Error('YouTube iframe API loaded without exposing the player namespace.'));
    };

    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.youtubeIframeApi = 'true';
    script.onerror = () => {
      reject(new Error('Failed to load the YouTube iframe API.'));
    };
    document.head.append(script);
  });

  return youtubeIframeApiPromise;
}

export async function createYouTubeMedia({
  container,
  videoId,
  onPositionChange
}: CreateYouTubeMediaOptions): Promise<YouTubeMediaHandle> {
  const youtube = await loadYouTubeIframeApi();
  container.replaceChildren();

  return new Promise<YouTubeMediaHandle>((resolve, reject) => {
    let isResolved = false;
    let isDestroyed = false;
    let playbackRate = 1;
    let masterVolume = 1;
    let pollTimer: number | null = null;
    let player: YouTubePlayer | null = null;

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const emitPosition = () => {
      if (!player || isDestroyed) {
        return;
      }

      onPositionChange(Math.round(player.getCurrentTime() * 1000));
    };

    const destroy = () => {
      if (isDestroyed) {
        return;
      }

      isDestroyed = true;
      stopPolling();
      player?.destroy();
      container.replaceChildren();
    };

    const handler: ExternalMediaHandler = {
      get backingTrackDuration() {
        return player ? Math.round(player.getDuration() * 1000) : 0;
      },
      get playbackRate() {
        return playbackRate;
      },
      set playbackRate(value: number) {
        playbackRate = Number.isFinite(value) && value > 0 ? value : 1;

        if (!player) {
          return;
        }

        try {
          player.setPlaybackRate(pickSupportedPlaybackRate(player, playbackRate));
        } catch {
          return;
        }
      },
      get masterVolume() {
        return masterVolume;
      },
      set masterVolume(value: number) {
        masterVolume = clampUnitInterval(value);

        if (player) {
          player.setVolume(Math.round(masterVolume * 100));
        }
      },
      seekTo(time: number) {
        if (!player) {
          return;
        }

        player.seekTo(Math.max(0, time) / 1000, true);
        emitPosition();
      },
      play() {
        player?.playVideo();
      },
      pause() {
        player?.pauseVideo();
        emitPosition();
      }
    };

    player = new youtube.Player(container, {
      videoId,
      playerVars: {
        playsinline: 1,
        rel: 0,
        origin: window.location.origin
      },
      events: {
        onReady: () => {
          if (isDestroyed || !player) {
            return;
          }

          handler.masterVolume = masterVolume;
          handler.playbackRate = playbackRate;
          emitPosition();

          if (!isResolved) {
            isResolved = true;
            resolve({ handler, destroy });
          }
        },
        onStateChange: (event) => {
          if (isDestroyed || !player) {
            return;
          }

          if (event.data === youtube.PlayerState.PLAYING) {
            stopPolling();
            pollTimer = window.setInterval(emitPosition, YOUTUBE_POLL_INTERVAL_MS);
            return;
          }

          if (
            event.data === youtube.PlayerState.PAUSED ||
            event.data === youtube.PlayerState.BUFFERING ||
            event.data === youtube.PlayerState.ENDED
          ) {
            stopPolling();
            emitPosition();
          }
        },
        onError: (event) => {
          destroy();

          if (!isResolved) {
            reject(new Error(`YouTube player error ${event.data}.`));
          }
        }
      }
    });
  });
}
