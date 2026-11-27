import type { MediaItem } from '../types/music';

export type VideoSource =
  | { kind: 'youtube'; id: string; embedUrl: string; thumbUrl: string; watchUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string; watchUrl: string }
  | { kind: 'file'; url: string };

/** Understands YouTube (watch, youtu.be, shorts, embed), Vimeo, and direct .mp4/.webm/.ogg files. Anything else: null. */
export function parseVideoUrl(raw: string): VideoSource | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let yt: string | null = null;
  if (host === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') yt = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/);
      if (m) yt = m[1];
    }
  }
  if (yt && /^[A-Za-z0-9_-]{6,15}$/.test(yt)) {
    return {
      kind: 'youtube',
      id: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`,
      thumbUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${yt}`,
    };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/\/(\d{5,12})(?:\/|$)/);
    if (m) return { kind: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}?autoplay=1`, watchUrl: `https://vimeo.com/${m[1]}` };
  }
  if (/\.(mp4|webm|ogv|ogg)$/i.test(u.pathname)) return { kind: 'file', url: raw.trim() };
  return null;
}

/** Image URLs: this site's own files (/photo.jpg) or https links. Nothing else (no javascript:, data:, http:). */
export const isSafeImageUrl = (url: string): boolean => /^\/(?!\/)[^\s]*$/.test(url.trim()) || /^https:\/\/[^\s]+$/i.test(url.trim());

/** Items that can actually be shown (an unplayable video link or an empty image URL is skipped, never shown broken). */
export function usableMedia(items: MediaItem[] | undefined): MediaItem[] {
  return (items ?? []).filter((m) => (m.kind === 'image' ? isSafeImageUrl(m.url) : parseVideoUrl(m.url) !== null));
}
