import { parseYouTubeVideoId } from './youtube';

describe('parseYouTubeVideoId', () => {
  it('extracts IDs from standard watch URLs', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts IDs from short URLs', () => {
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts IDs from embed-style URLs', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('accepts raw video IDs', () => {
    expect(parseYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects invalid values', () => {
    expect(parseYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYouTubeVideoId('not-a-url')).toBeNull();
    expect(parseYouTubeVideoId('')).toBeNull();
  });
});
