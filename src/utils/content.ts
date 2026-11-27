import type { BookingEvent, PortfolioConfig } from '../types/music';
import { todayISO } from './validation';

/** Only https links are rendered as hrefs (blocks javascript:, data: and plain-http links). */
export const safeHttpsUrl = (url: string): string | undefined => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : undefined;
  } catch {
    return undefined;
  }
};

/** The About section (and its nav link) exists only when the owner has supplied content for it. */
export const hasAboutContent = (p: PortfolioConfig): boolean =>
  Boolean(p.biography.trim() || p.highlights.length > 0 || p.stageRider.length > 0 || p.location.trim());

/** An event may appear on the public site only if the owner shows it and it was not declined or cancelled. */
export const isPubliclyShowable = (b: BookingEvent): boolean => b.isPublic && b.status !== 'Declined';

/** Public events that are today or later (or have no usable date), soonest first. */
export function upcomingPublicEvents(bookings: BookingEvent[], today: string = todayISO()): BookingEvent[] {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  return bookings
    .filter((b) => isPubliclyShowable(b) && (!isoDate.test(b.date) || b.date >= today))
    .sort((a, b) => (isoDate.test(a.date) ? a.date : '9999').localeCompare(isoDate.test(b.date) ? b.date : '9999'));
}

/** "2026-12-06" -> "Sun 6 Dec 2026"; anything that is not an ISO date is returned unchanged. */
export function formatEventDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Builds the TikTok profile link from the handle the owner typed.
 * Accepts "Name", "@Name", or a pasted link such as "https://www.tiktok.com/@Name?lang=en".
 * Returns undefined when the handle is empty or has characters TikTok does not allow
 * (TikTok user names use letters, numbers, underscores and full stops).
 */
export const tiktokProfileUrl = (handle: string, fallbackUrl = ''): string | undefined => {
  let h = (handle || '').trim();
  const fromLink = h.match(/tiktok\.com\/@([^/?#\s]+)/i);
  if (fromLink) h = fromLink[1];
  h = h.replace(/^@+/, '');
  if (/^[A-Za-z0-9._]{2,24}$/.test(h)) return `https://www.tiktok.com/@${h}`;
  // Handle is empty or odd: fall back to a saved https link, if any.
  return h ? undefined : safeHttpsUrl(fallbackUrl);
};

/**
 * Hero tagline accent: words the owner wraps in *stars* are shown in blue.
 * With no stars, the last two words get the accent (only when the tagline has 4+ words).
 */
export function taglineParts(text: string): { text: string; accent: boolean }[] {
  const t = text.trim();
  if (!t) return [];
  if (/\*[^*]+\*/.test(t)) {
    return t
      .split(/(\*[^*]+\*)/)
      .filter(Boolean)
      .map((seg) => (/^\*[^*]+\*$/.test(seg) ? { text: seg.slice(1, -1), accent: true } : { text: seg, accent: false }));
  }
  const words = t.split(/\s+/);
  if (words.length < 4) return [{ text: t, accent: false }];
  return [
    { text: `${words.slice(0, -2).join(' ')} `, accent: false },
    { text: words.slice(-2).join(' '), accent: true },
  ];
}
