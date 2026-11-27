import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isSafeImageUrl, parseVideoUrl, usableMedia } from '../utils/media';
import { taglineParts } from '../utils/content';
import { googleCalendarUrl } from '../utils/calendar';
import type { BookingEvent } from '../types/music';

const evt = (o: Partial<BookingEvent> = {}): BookingEvent => ({
  id: 'e1', eventName: 'Night of Praise', organizer: 'Host', contactPhone: '', contactEmail: '', venue: 'Hall', city: 'Accra',
  date: '2026-12-06', time: '18:00', eventType: 'Concert', status: 'Confirmed', feeGHS: 0, depositPaid: false, isPublic: true, notes: '', ...o,
});

describe('studio / visitor split (source level)', () => {
  // comments may explain the split; only real code is checked
  const visitor = readFileSync('src/App.tsx', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('the visitor app has no Studio code and no Studio link', () => {
    expect(visitor).not.toMatch(/ManagementDashboard/);
    expect(visitor).not.toMatch(/StudioApp/);
    expect(visitor).not.toMatch(/studio/i);
    expect(visitor).not.toMatch(/markOwnerBrowser/);
  });
  it('the Studio entry is its own page and marks the browser as the owner\'s', () => {
    const studio = readFileSync('src/StudioApp.tsx', 'utf8');
    expect(studio).toMatch(/markOwnerBrowser/);
    expect(readFileSync('studio/index.html', 'utf8')).toMatch(/studio-main\.tsx/);
    expect(readFileSync('studio/index.html', 'utf8')).toMatch(/noindex/);
  });
});

describe('video links', () => {
  it('understands YouTube and Vimeo and direct files', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=3')).toMatchObject({ kind: 'youtube' });
    expect(parseVideoUrl('https://youtube.com/shorts/dQw4w9WgXcQ')).toMatchObject({ kind: 'youtube' });
    expect(parseVideoUrl('https://vimeo.com/123456789')).toMatchObject({ kind: 'vimeo', id: '123456789' });
    expect(parseVideoUrl('https://x.test/a/live.mp4')).toMatchObject({ kind: 'file' });
  });
  it('rejects anything else, including scripts', () => {
    for (const bad of ['', 'javascript:alert(1)', 'data:text/html,hi', 'https://evil.test/page', 'https://youtube.com/watch?v=<x>', 'ftp://a/b.mp4']) {
      expect(parseVideoUrl(bad)).toBeNull();
    }
  });
  it('embeds with the no-cookie domain', () => {
    const v = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(v && v.kind === 'youtube' && v.embedUrl.startsWith('https://www.youtube-nocookie.com/embed/')).toBe(true);
  });
});

describe('photo links and usable media', () => {
  it('accepts own-site paths and https only', () => {
    expect(isSafeImageUrl('/photo.jpg')).toBe(true);
    expect(isSafeImageUrl('https://a.test/p.jpg')).toBe(true);
    for (const bad of ['', '//evil.test/x.jpg', 'http://a.test/p.jpg', 'javascript:x', 'data:image/png;base64,AA', '/a b.jpg']) expect(isSafeImageUrl(bad)).toBe(false);
  });
  it('drops unusable items instead of showing them broken', () => {
    const list = usableMedia([
      { id: '1', kind: 'image', url: '/ok.jpg', title: '' },
      { id: '2', kind: 'image', url: 'javascript:1', title: '' },
      { id: '3', kind: 'video', url: 'https://youtu.be/dQw4w9WgXcQ', title: '' },
      { id: '4', kind: 'video', url: 'https://nope.test', title: '' },
    ]);
    expect(list.map((m) => m.id)).toEqual(['1', '3']);
    expect(usableMedia(undefined)).toEqual([]);
  });
});

describe('tagline accent', () => {
  it('uses the owner\'s *stars*', () => {
    expect(taglineParts('Leading *worship* with *skill*')).toEqual([
      { text: 'Leading ', accent: false }, { text: 'worship', accent: true }, { text: ' with ', accent: false }, { text: 'skill', accent: true },
    ]);
  });
  it('accents the last two words when there are no stars and 4+ words', () => {
    const p = taglineParts('Music that carries a message');
    expect(p[1]).toEqual({ text: 'a message', accent: true });
  });
  it('leaves short or empty taglines alone', () => {
    expect(taglineParts('Short line')).toEqual([{ text: 'Short line', accent: false }]);
    expect(taglineParts('   ')).toEqual([]);
  });
});

describe('Google Calendar link', () => {
  it('builds a timed event (2 hours) with the place', () => {
    const u = new URL(googleCalendarUrl(evt(), 'Emma Revelation')!);
    expect(u.hostname).toBe('calendar.google.com');
    expect(u.searchParams.get('dates')).toBe('20261206T180000/20261206T200000');
    expect(u.searchParams.get('location')).toBe('Hall, Accra');
  });
  it('is all-day without a time, and null without a valid date', () => {
    expect(new URL(googleCalendarUrl(evt({ time: '' }), 'E')!).searchParams.get('dates')).toBe('20261206/20261207');
    expect(googleCalendarUrl(evt({ date: 'Soon' }), 'E')).toBeNull();
  });
});

import { withBase } from '../utils/basePath';
describe('sub-folder hosting (GitHub Pages)', () => {
  it('adds the sub-folder to this site\'s own files', () => {
    expect(withBase('/audio/a.mp3', '/emma-revelation/')).toBe('/emma-revelation/audio/a.mp3');
    expect(withBase('/emma-portrait.jpg', '/emma-revelation')).toBe('/emma-revelation/emma-portrait.jpg');
  });
  it('leaves links, empty values and already-prefixed paths alone', () => {
    expect(withBase('https://x.com/a.mp3', '/emma-revelation/')).toBe('https://x.com/a.mp3');
    expect(withBase('//cdn.x.com/a.jpg', '/emma-revelation/')).toBe('//cdn.x.com/a.jpg');
    expect(withBase('/emma-revelation/a.jpg', '/emma-revelation/')).toBe('/emma-revelation/a.jpg');
    expect(withBase('', '/emma-revelation/')).toBe('');
    expect(withBase('/a.jpg', '/')).toBe('/a.jpg');
  });
});
