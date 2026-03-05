export type ReaderErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'PARSE_FAILED'
  | 'ASSET_LOAD_FAILED'
  | 'AUDIO_INIT_FAILED';

export class ReaderEngineError extends Error {
  readonly code: ReaderErrorCode;
  override readonly cause?: unknown;

  constructor(code: ReaderErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ReaderEngineError';
    this.code = code;
    this.cause = cause;
  }
}
