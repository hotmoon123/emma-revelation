import { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { withBase } from '../../utils/basePath';
import { imageKey, loadImageManifest, srcSetFor, type ImageSet } from '../../utils/imageSets';

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** classes for the <img> itself (size, object-fit, rounding) */
  className?: string;
  /** classes for the wrapper (use when the image must fill a box) */
  wrapperClassName?: string;
  /** above-the-fold image: loaded eagerly with high priority */
  priority?: boolean;
  /** how wide the image is drawn, e.g. "(min-width:1024px) 480px, 90vw" */
  sizes?: string;
}

/**
 * Image with a skeleton while it loads, a soft fade-in, a calm fallback if it fails, and
 * AVIF/WebP/JPEG responsive sources when `npm run images` has generated them.
 */
export function SmartImage({ src, alt, width, height, className = '', wrapperClassName = '', priority = false, sizes }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [set, setSet] = useState<ImageSet | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  const key = imageKey(src);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    let live = true;
    void loadImageManifest().then((m) => live && setSet(m[key] ?? null));
    return () => {
      live = false;
    };
  }, [key]);

  // reset when the source changes; a cached image may already be complete
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [src, set]);

  const imgProps = {
    ref,
    alt,
    width,
    height,
    sizes,
    decoding: 'async' as const,
    loading: priority ? ('eager' as const) : ('lazy' as const),
    fetchPriority: priority ? ('high' as const) : undefined,
    onLoad: () => setLoaded(true),
    onError: () => setFailed(true),
    className: `${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`,
  };

  return (
    <span className={`relative block ${wrapperClassName}`} data-state={failed ? 'error' : loaded ? 'ready' : 'loading'}>
      {!loaded && !failed && <span className="skeleton absolute inset-0 rounded-[inherit]" aria-hidden="true" />}
      {failed ? (
        <span role="img" aria-label={alt || 'Image unavailable'} className={`${className} grid place-items-center bg-[#F8FAFC] text-[#94A3B8]`}>
          <ImageOff className="w-6 h-6" aria-hidden="true" />
        </span>
      ) : set ? (
        <picture>
          {set.formats.map((f) => (
            <source key={f} type={`image/${f}`} srcSet={srcSetFor(key, f, set.widths, base)} sizes={sizes} />
          ))}
          <img {...imgProps} src={`${base}${set.fallback.replace(/^\//, '')}`} />
        </picture>
      ) : (
        <img {...imgProps} src={withBase(src)} />
      )}
    </span>
  );
}
