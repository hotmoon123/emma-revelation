/**
 * The site can live in a sub-folder (GitHub Pages: /emma-revelation/). Addresses typed in the Studio
 * such as "/audio/song.mp3" or "/emma-portrait.jpg" mean "a file of this site", so the sub-folder is added.
 * Full https links and already-prefixed paths are returned unchanged.
 */
export function withBase(url: string, base: string = import.meta.env.BASE_URL): string {
  const u = (url ?? '').trim();
  if (!u.startsWith('/') || u.startsWith('//')) return u;
  const b = base.endsWith('/') ? base : `${base}/`;
  if (b === '/' || u.startsWith(b)) return u;
  return `${b}${u.slice(1)}`;
}
