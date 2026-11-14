import type { PortfolioBackup } from './validation';
import { parsePortfolioBackup } from './validation';
import { isPubliclyShowable } from './content';

/**
 * PUBLISHING (frontend-only flow, UX spec decision Q1)
 * The owner edits content in Studio (stored in this browser), clicks "Export for publishing",
 * and replaces `public/content.json` with the downloaded file before deploying.
 * Visitors' browsers read that file. Private data never leaves the owner's browser:
 * booking inquiries, contact details, fees and setlists are NOT written to the published file.
 */
export interface PublishedContent extends PortfolioBackup {
  version: 1;
  publishedAt: string;
}

export function buildPublishedContent(source: PortfolioBackup, now: Date = new Date()): PublishedContent {
  return {
    version: 1,
    publishedAt: now.toISOString(),
    profile: source.profile,
    tracks: source.tracks,
    // Only events the owner marked "Shown on Site" and did not decline or cancel, with private fields removed.
    bookings: source.bookings
      .filter(isPubliclyShowable)
      .map((b) => ({ ...b, contactPhone: '', contactEmail: '', feeGHS: 0, depositPaid: false })),
    setlists: [],
  };
}

const OWNER_KEY = 'emma_rev_owner_v1';

/** An "owner browser" has opened Studio at least once; its local copy is never replaced by the published file. */
export function isOwnerBrowser(): boolean {
  try {
    return localStorage.getItem(OWNER_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOwnerBrowser(): void {
  try {
    localStorage.setItem(OWNER_KEY, '1');
  } catch {
    /* storage blocked: nothing to remember */
  }
}

/** Fetches `content.json` next to the app. Resolves to null when it is missing, invalid, or the network fails. */
export async function loadPublishedContent(url: string = `${import.meta.env.BASE_URL}content.json`): Promise<PortfolioBackup | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { cache: 'no-cache', signal: controller.signal });
    if (!res.ok) return null;
    const parsed = parsePortfolioBackup(await res.text());
    return parsed.ok ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
