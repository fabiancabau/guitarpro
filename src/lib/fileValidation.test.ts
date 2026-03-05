import { getFileExtension, validateGuitarProFile } from './fileValidation';

describe('fileValidation', () => {
  it('extracts lower-cased extension', () => {
    expect(getFileExtension('Song.GP5')).toBe('.gp5');
  });

  it('accepts supported guitar pro extensions', () => {
    const result = validateGuitarProFile({ name: 'solo.gpx', type: 'application/octet-stream' });
    expect(result.ok).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    const result = validateGuitarProFile({ name: 'lyrics.txt', type: 'text/plain' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNSUPPORTED_FORMAT');
    }
  });
});
