import { ReaderEngineError } from '@domain/errors';
import { mapEngineError } from './errorMapping';

describe('mapEngineError', () => {
  it('passes through ReaderEngineError instances', () => {
    const source = new ReaderEngineError('PARSE_FAILED', 'x');
    expect(mapEngineError(source)).toBe(source);
  });

  it('maps unsupported messages', () => {
    const mapped = mapEngineError(new Error('unsupported format signature'));
    expect(mapped.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('maps audio initialization messages', () => {
    const mapped = mapEngineError(new Error('soundfont missing'));
    expect(mapped.code).toBe('AUDIO_INIT_FAILED');
  });

  it('maps unknown messages to parse failed', () => {
    const mapped = mapEngineError(new Error('bad bytes'));
    expect(mapped.code).toBe('PARSE_FAILED');
  });
});
