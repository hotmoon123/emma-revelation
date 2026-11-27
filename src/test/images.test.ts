import { describe, expect, it } from 'vitest';
import { imageKey, parseManifest, srcSetFor } from '../utils/imageSets';

describe('image sets', () => {
  it('matches a photo by file name', () => {
    expect(imageKey('/emma-portrait.jpg')).toBe('emma-portrait');
    expect(imageKey('https://x.test/a/b/Cover.PNG?v=2')).toBe('Cover');
    expect(imageKey('')).toBe('');
  });
  it('keeps only well-formed manifest entries', () => {
    const m = parseManifest({
      ok: { width: 864, height: 1080, widths: [480, 864], formats: ['avif', 'webp'], fallback: 'img/ok-864.jpg' },
      bad1: { width: 1 },
      bad2: 'nope',
      bad3: { width: 1, height: 1, widths: ['x'], formats: [], fallback: 'a' },
    });
    expect(Object.keys(m)).toEqual(['ok']);
    expect(parseManifest(null)).toEqual({});
    expect(parseManifest('<html>')).toEqual({});
  });
  it('builds a srcset with widths', () => {
    expect(srcSetFor('p', 'webp', [480, 960], '/')).toBe('/img/p-480.webp 480w, /img/p-960.webp 960w');
  });
});
