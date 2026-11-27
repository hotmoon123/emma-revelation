import { describe, expect, it } from 'vitest';
import { INITIAL_PORTFOLIO_CONFIG } from '../data/initialData';
import type { BookingEvent } from '../types/music';
import { formatEventDate, hasAboutContent, safeHttpsUrl, tiktokProfileUrl, upcomingPublicEvents } from '../utils/content';
import { buildPublishedContent } from '../utils/publish';
import { parsePortfolioBackup } from '../utils/validation';

const evt = (over: Partial<BookingEvent>): BookingEvent => ({
  id: 'e1',
  eventName: 'Sample',
  organizer: 'Host',
  contactPhone: '0240000000',
  contactEmail: 'a@b.co',
  venue: 'Venue',
  city: 'City',
  date: '2026-12-06',
  time: '',
  eventType: 'Concert',
  status: 'Confirmed',
  feeGHS: 500,
  depositPaid: true,
  isPublic: true,
  notes: '',
  ...over,
});

describe('About section rule (UQ7)', () => {
  it('is hidden while the owner has supplied nothing', () => {
    expect(hasAboutContent(INITIAL_PORTFOLIO_CONFIG)).toBe(false);
  });
  it('appears once there is a biography, highlight, rider item or location', () => {
    expect(hasAboutContent({ ...INITIAL_PORTFOLIO_CONFIG, biography: 'Hello' })).toBe(true);
    expect(hasAboutContent({ ...INITIAL_PORTFOLIO_CONFIG, location: 'Accra' })).toBe(true);
    expect(hasAboutContent({ ...INITIAL_PORTFOLIO_CONFIG, highlights: ['x'] })).toBe(true);
  });
});

describe('Public events', () => {
  it('hides private and past events and sorts the rest by date', () => {
    const list = upcomingPublicEvents(
      [
        evt({ id: 'late', date: '2027-01-10' }),
        evt({ id: 'past', date: '2026-01-01' }),
        evt({ id: 'private', isPublic: false }),
        evt({ id: 'soon', date: '2026-12-06' }),
      ],
      '2026-10-05'
    );
    expect(list.map((e) => e.id)).toEqual(['soon', 'late']);
  });
  it('hides a declined or cancelled event even when it is marked public', () => {
    const list = upcomingPublicEvents([evt({ id: 'ok', date: '2026-12-06' }), evt({ id: 'no', date: '2026-12-07', status: 'Declined' })], '2026-10-05');
    expect(list.map((e) => e.id)).toEqual(['ok']);
  });
  it('formats ISO dates and leaves anything else untouched', () => {
    expect(formatEventDate('2026-12-06')).toMatch(/6 Dec 2026/);
    expect(formatEventDate('Sunday')).toBe('Sunday');
  });
});

describe('Links', () => {
  it('allows https only', () => {
    expect(safeHttpsUrl('https://www.tiktok.com/@x')).toBeDefined();
    expect(safeHttpsUrl('http://example.com')).toBeUndefined();
    expect(safeHttpsUrl('javascript:alert(1)')).toBeUndefined();
  });
});

describe('Publishing (Q1): private data never leaves the owner browser', () => {
  const built = buildPublishedContent(
    {
      profile: INITIAL_PORTFOLIO_CONFIG,
      tracks: [],
      bookings: [evt({ id: 'pub' }), evt({ id: 'inquiry', isPublic: false, status: 'Inquiry' })],
      setlists: [{ id: 's1', title: 'Private', eventDate: '', venue: '', trackIds: [], bandNotes: 'secret' }],
    },
    new Date('2026-10-05T10:00:00Z')
  );
  it('keeps only public events and strips contact and money fields', () => {
    expect(built.bookings.map((b) => b.id)).toEqual(['pub']);
    expect(built.bookings[0]).toMatchObject({ contactPhone: '', contactEmail: '', feeGHS: 0, depositPaid: false });
  });
  it('never publishes a declined or cancelled event, even if it was shown', () => {
    const out = buildPublishedContent(
      { profile: INITIAL_PORTFOLIO_CONFIG, tracks: [], setlists: [], bookings: [evt({ id: 'ok' }), evt({ id: 'no', isPublic: true, status: 'Declined' })] },
      new Date('2026-10-05T10:00:00Z')
    );
    expect(out.bookings.map((b) => b.id)).toEqual(['ok']);
  });
  it('drops setlists and stamps the publish time', () => {
    expect(built.setlists).toEqual([]);
    expect(built.publishedAt).toBe('2026-10-05T10:00:00.000Z');
  });
  it('round-trips through the importer', () => {
    expect(parsePortfolioBackup(JSON.stringify(built)).ok).toBe(true);
  });
});

describe('tiktokProfileUrl', () => {
  it('builds the profile link from the handle, with or without @', () => {
    expect(tiktokProfileUrl('EmmaRevelation_Official')).toBe('https://www.tiktok.com/@EmmaRevelation_Official');
    expect(tiktokProfileUrl('  @EmmaRevelation_Official ')).toBe('https://www.tiktok.com/@EmmaRevelation_Official');
  });
  it('accepts a pasted TikTok link and drops tracking parameters', () => {
    expect(tiktokProfileUrl('https://www.tiktok.com/@abc.def?lang=en&utm=x')).toBe('https://www.tiktok.com/@abc.def');
  });
  it('rejects odd handles and falls back only when the handle is empty', () => {
    expect(tiktokProfileUrl('bad handle!', 'https://www.tiktok.com/@old')).toBeUndefined();
    expect(tiktokProfileUrl('', 'https://www.tiktok.com/@old')).toBe('https://www.tiktok.com/@old');
    expect(tiktokProfileUrl('', 'javascript:alert(1)')).toBeUndefined();
  });
});
