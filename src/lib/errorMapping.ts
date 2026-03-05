import { ReaderEngineError } from '@domain/errors';

function messageOf(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Unknown parser error';
}

export function mapEngineError(error: unknown): ReaderEngineError {
  if (error instanceof ReaderEngineError) {
    return error;
  }

  const message = messageOf(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('unsupported') || normalized.includes('unknown format')) {
    return new ReaderEngineError('UNSUPPORTED_FORMAT', 'This tab format is not supported yet.', error);
  }

  if (normalized.includes('soundfont') || normalized.includes('audio') || normalized.includes('midi')) {
    return new ReaderEngineError('AUDIO_INIT_FAILED', 'Audio playback could not be initialized.', error);
  }

  if (normalized.includes('wasm') || normalized.includes('worker') || normalized.includes('asset')) {
    return new ReaderEngineError('ASSET_LOAD_FAILED', 'Required rendering assets failed to load.', error);
  }

  return new ReaderEngineError('PARSE_FAILED', 'The tab could not be parsed. The file may be corrupted.', error);
}
