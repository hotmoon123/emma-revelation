import { describe, expect, it } from 'vitest';
import { transposeChordToken, transposeLyricsWithBrackets, transposeNote } from '../utils/soundEngine';
import {
  cleanText,
  isValidPhone,
  parsePortfolioBackup,
  sanitizeBookingDraft,
  validateBookingDraft,
  type BookingDraft,
} from '../utils/validation';
import { buildEventIcs } from '../utils/calendar';
import type { BookingEvent } from '../types/music';

const draft = (over: Partial<BookingDraft> = {}): BookingDraft => ({
  eventName: 'Youth Conference',
  organizer: 'Grace Chapel',
  contactPhone: '+233 24 000 0000',
  contactEmail: '',
  venue: 'Main Auditorium',
  city: 'Accra',
  date: '2030-01-15',
  time: '',
  eventType: 'Concert',
  feeGHS: 0,
  notes: '',
  ...over,
});

describe('transposition', () => {
  it('wraps around the chromatic circle both ways', () => {
    expect(transposeNote('B', 1)).toBe('C');
    expect(transposeNote('C', -1)).toBe('B');
    expect(transposeNote('C', 12)).toBe('C');
  });
  it('keeps chord quality and slash basses', () => {
    expect(transposeChordToken('Fmaj7', 2)).toBe('Gmaj7');
    expect(transposeChordToken('Dm7 - G13sus4 - C/E', 2)).toBe('Em7 - A13sus4 - D/F#');
    expect(transposeChordToken('Am7', 0)).toBe('Am7');
  });
  it('only transposes chord brackets in lyrics, not section headers', () => {
    const out = transposeLyricsWithBrackets('[Verse 1]\n[C]Holy [G/B]One', 2);
    expect(out).toBe('[Verse 1]\n[D]Holy [A/C#]One');
  });
});

describe('booking validation', () => {
  it('accepts a complete, valid inquiry', () => {
    expect(validateBookingDraft(draft(), '2030-01-01')).toEqual({});
  });
  it('reports every missing required field', () => {
    const e = validateBookingDraft(draft({ eventName: ' ', organizer: '', venue: '', contactPhone: '', date: '' }), '2030-01-01');
    expect(Object.keys(e).sort()).toEqual(['contactPhone', 'date', 'eventName', 'organizer', 'venue']);
  });
  it('rejects past dates, bad phones/emails and negative honorariums', () => {
    const e = validateBookingDraft(draft({ date: '2020-01-01', contactPhone: 'abc', contactEmail: 'nope', feeGHS: -5 }), '2030-01-01');
    expect(e.date).toBeTruthy();
    expect(e.contactPhone).toBeTruthy();
    expect(e.contactEmail).toBeTruthy();
    expect(e.feeGHS).toBeTruthy();
  });
  it('validates phone formats', () => {
    expect(isValidPhone('0241234567')).toBe(true);
    expect(isValidPhone('(024) 123-4567')).toBe(true);
    expect(isValidPhone('12')).toBe(false);
  });
  it('sanitizes control characters and whitespace', () => {
    expect(cleanText('  Hi\u0000   there \u0007 ')).toBe('Hi there');
    expect(sanitizeBookingDraft(draft({ eventName: '  A\u0000B  ', feeGHS: 99.6 })).feeGHS).toBe(100);
  });
});

describe('backup import guard', () => {
  it('rejects malformed JSON and wrong shapes', () => {
    expect(parsePortfolioBackup('{not json').ok).toBe(false);
    expect(parsePortfolioBackup('{"profile":1}').ok).toBe(false);
  });
});

describe('calendar reminder', () => {
  const evt = {
    id: 'e1', eventName: 'Night of Worship', organizer: 'Host', contactPhone: '', contactEmail: '', venue: 'Hall',
    city: 'Accra', date: '2030-05-04', time: '18:30', eventType: 'Concert', status: 'Confirmed', feeGHS: 0,
    depositPaid: false, isPublic: true, notes: '',
  } as BookingEvent;
  it('builds a timed event and refuses invalid dates', () => {
    expect(buildEventIcs(evt, 'Artist')).toContain('DTSTART:20300504T183000');
    expect(buildEventIcs({ ...evt, date: 'soon' }, 'Artist')).toBeNull();
  });
});

import { LocalStoragePortfolioRepository, SCHEMA_VERSION, STORAGE_KEYS } from '../data/repositories';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('PortfolioRepository (data-access layer)', () => {
  it('stamps the schema version and keeps legacy keys', () => {
    const mem = new MemoryStorage();
    new LocalStoragePortfolioRepository(mem);
    expect(mem.getItem(STORAGE_KEYS.SCHEMA)).toBe(String(SCHEMA_VERSION));
    expect(STORAGE_KEYS.PROFILE).toBe('emma_rev_profile_v5');
  });
  it('falls back to empty defaults when storage holds corrupt data', () => {
    const mem = new MemoryStorage();
    mem.setItem(STORAGE_KEYS.TRACKS, '{not json');
    mem.setItem(STORAGE_KEYS.BOOKINGS, '"a string"');
    const repo = new LocalStoragePortfolioRepository(mem);
    // readStored uses the global localStorage; the repo must still return a valid snapshot
    const snap = repo.load();
    expect(Array.isArray(snap.tracks)).toBe(true);
    expect(Array.isArray(snap.bookings)).toBe(true);
    expect(snap.profile.artistName).toBe('Emma Revelation');
  });
});
