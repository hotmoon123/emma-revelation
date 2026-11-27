/**
 * Responsive image sets. `npm run images` reads the full-size originals in /originals and writes
 * smaller AVIF/WebP/JPEG copies to public/img plus public/img/manifest.json. The app only uses a set
 * when the manifest lists it, so a missing manifest or file never causes a broken image.
 * Sizes are never enlarged: a 864 px photo can not become a real 4K photo.
 */
export interface ImageSet {
  width: number;
  height: number;
  widths: number[];
  formats: string[]; // e.g. ['avif', 'webp']
  fallback: string; // jpeg url
}
export type ImageManifest = Record<string, ImageSet>;

/** "/emma-portrait.jpg" -> "emma-portrait" */
export function imageKey(url: string): string {
  const file = url.split('?')[0].split('#')[0].split('/').pop() ?? '';
  return file.replace(/\.[A-Za-z0-9]+$/, '');
}

export function parseManifest(raw: unknown): ImageManifest {
  const out: ImageManifest = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const s = v as Partial<ImageSet>;
    if (
      s && Array.isArray(s.widths) && s.widths.every((n) => typeof n === 'number') && s.widths.length > 0 &&
      Array.isArray(s.formats) && typeof s.fallback === 'string' && typeof s.width === 'number' && typeof s.height === 'number'
    ) {
      out[k] = s as ImageSet;
    }
  }
  return out;
}

export function srcSetFor(key: string, format: string, widths: number[], base: string): string {
  return widths.map((w) => `${base}img/${key}-${w}.${format} ${w}w`).join(', ');
}

let cache: Promise<ImageManifest> | null = null;
/** Loaded once. Resolves to {} when the manifest is absent or invalid (the SPA fallback returns HTML, not JSON). */
export function loadImageManifest(base: string = import.meta.env.BASE_URL): Promise<ImageManifest> {
  if (!cache) {
    cache = fetch(`${base}img/manifest.json`)
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : {}))
      .then(parseManifest)
      .catch(() => ({}));
  }
  return cache;
}
