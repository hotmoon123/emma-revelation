/**
 * Client-side validation. This is a UX layer only — it is NOT a security
 * boundary (see docs/SECURITY.md). Any real backend must validate again.
 */
import type { BookingEvent, PortfolioConfig, Setlist, Track } from '../types/music';

export type BookingDraft = Omit<BookingEvent, 'id' | 'status' | 'depositPaid' | 'isPublic'>;
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export const LIMITS = {
  shortText: 120,
  longText: 2000,
  maxFeeGHS: 10_000_000,
} as const;

/** Collapse control characters / excess whitespace and trim. */
export function cleanText(value: string, max: number = LIMITS.shortText): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Accepts +233 24 123 4567, 0241234567, (024) 123-4567 … 7–15 digits
export function isValidPhone(value: string): boolean {
  if (!/^[+(\d][\d\s().-]*$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function validateBookingDraft(
  draft: BookingDraft,
  today: string = todayISO()
): FieldErrors<BookingDraft> {
  const errors: FieldErrors<BookingDraft> = {};

  if (!cleanText(draft.eventName)) errors.eventName = 'Enter the event or program title.';
  if (!cleanText(draft.organizer)) errors.organizer = 'Enter the host church or organization.';
  if (!cleanText(draft.venue)) errors.venue = 'Enter the venue.';

  if (!draft.date) errors.date = 'Choose the event date.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.date = 'Enter a valid date.';
  else if (draft.date < today) errors.date = 'The event date cannot be in the past.';

  const phone = cleanText(draft.contactPhone, 40);
  if (!phone) errors.contactPhone = 'Enter a phone or WhatsApp number so we can reach you.';
  else if (!isValidPhone(phone)) errors.contactPhone = 'Enter a valid phone number, e.g. +233 24 000 0000.';

  const email = cleanText(draft.contactEmail, 160);
  if (email && !EMAIL_RE.test(email)) errors.contactEmail = 'Enter a valid email address or leave it empty.';

  if (!Number.isFinite(draft.feeGHS) || draft.feeGHS < 0 || draft.feeGHS > LIMITS.maxFeeGHS) {
    errors.feeGHS = 'Enter an honorarium of 0 or more.';
  }

  if (draft.notes.length > LIMITS.longText) {
    errors.notes = `Keep details under ${LIMITS.longText} characters.`;
  }
  return errors;
}

/** Return a sanitized copy that is safe to store / send. */
export function sanitizeBookingDraft(draft: BookingDraft): BookingDraft {
  return {
    ...draft,
    eventName: cleanText(draft.eventName),
    organizer: cleanText(draft.organizer),
    venue: cleanText(draft.venue),
    city: cleanText(draft.city),
    contactPhone: cleanText(draft.contactPhone, 40),
    contactEmail: cleanText(draft.contactEmail, 160),
    eventType: cleanText(draft.eventType),
    notes: draft.notes.replace(/\u0000/g, '').trim().slice(0, LIMITS.longText),
    feeGHS: Math.max(0, Math.round(Number(draft.feeGHS) || 0)),
  };
}

/* ---------- Backup / storage shape guards ---------- */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

export function isPortfolioConfig(v: unknown): v is PortfolioConfig {
  return (
    isObj(v) &&
    isStr(v.artistName) &&
    isStr(v.roleBadge) &&
    isStr(v.biography) &&
    isStr(v.heroTagline) &&
    Array.isArray(v.highlights) &&
    Array.isArray(v.stageRider) &&
    Array.isArray(v.genres) &&
    Array.isArray(v.eventCategories)
  );
}

export const isTrackArray = (v: unknown): v is Track[] =>
  Array.isArray(v) && v.every((t) => isObj(t) && isStr(t.id) && isStr(t.title));

export const isBookingArray = (v: unknown): v is BookingEvent[] =>
  Array.isArray(v) && v.every((b) => isObj(b) && isStr(b.id) && isStr(b.eventName));

export const isSetlistArray = (v: unknown): v is Setlist[] =>
  Array.isArray(v) && v.every((s) => isObj(s) && isStr(s.id) && Array.isArray(s.trackIds));

export interface PortfolioBackup {
  profile: PortfolioConfig;
  tracks: Track[];
  bookings: BookingEvent[];
  setlists: Setlist[];
}

/** Validates an imported JSON backup. Returns the backup or an error message. */
export function parsePortfolioBackup(raw: string): { ok: true; data: PortfolioBackup } | { ok: false; error: string } {
  if (raw.length > 5_000_000) return { ok: false, error: 'That file is too large (max 5 MB).' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!isObj(parsed)) return { ok: false, error: 'Unexpected backup format.' };
  if (!isPortfolioConfig(parsed.profile)) return { ok: false, error: 'The backup is missing a valid profile.' };
  if (!isTrackArray(parsed.tracks)) return { ok: false, error: 'The backup has an invalid tracks list.' };
  if (!isBookingArray(parsed.bookings)) return { ok: false, error: 'The backup has an invalid bookings list.' };
  if (!isSetlistArray(parsed.setlists)) return { ok: false, error: 'The backup has an invalid setlists list.' };
  return {
    ok: true,
    data: { profile: parsed.profile, tracks: parsed.tracks, bookings: parsed.bookings, setlists: parsed.setlists },
  };
}
