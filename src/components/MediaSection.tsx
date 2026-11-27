import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import type { MediaItem } from '../types/music';
import { parseVideoUrl, usableMedia } from '../utils/media';
import { SmartImage } from './ui/SmartImage';

const EYEBROW = 'text-sm font-bold tracking-widest uppercase text-[#2563EB]';

/** One video: nothing is loaded from YouTube/Vimeo until the visitor taps play (faster page, no tracking before consent by action). */
function VideoCard({ item }: { item: MediaItem }) {
  const [started, setStarted] = useState(false);
  const src = parseVideoUrl(item.url);
  if (!src) return null;
  return (
    <figure className="rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm">
      <div className="relative aspect-video bg-[#0F172A]">
        {src.kind === 'file' ? (
          <video controls preload="none" playsInline className="absolute inset-0 w-full h-full" aria-label={item.title || 'Video'}>
            <source src={src.url} />
            Your browser can not play this video.
          </video>
        ) : started ? (
          <iframe
            src={src.embedUrl}
            title={item.title || 'Video'}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setStarted(true)}
            aria-label={`Play video: ${item.title || 'Performance'}`}
            className="absolute inset-0 w-full h-full grid place-items-center bg-gradient-to-br from-[#1D4ED8] to-[#0F172A] text-white group"
          >
            <span className="w-16 h-16 rounded-full bg-white text-[#2563EB] grid place-items-center shadow-lg transition-transform group-hover:scale-105">
              <Play className="w-7 h-7 ml-0.5" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="p-4 flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-[#0F172A]">{item.title || 'Performance'}</span>
        {src.kind !== 'file' && (
          <a href={src.watchUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1 shrink-0">
            Open <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        )}
      </figcaption>
    </figure>
  );
}

/** Optional gallery: rendered only when the owner has added at least one usable photo or video. */
export function MediaSection({ items }: { items: MediaItem[] | undefined }) {
  const list = usableMedia(items);
  if (list.length === 0) return null;
  return (
    <section id="media" aria-labelledby="media-title" className="bg-white py-16 lg:py-20 border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className={EYEBROW}>Watch</p>
          <h2 id="media-title" className="text-fluid-h2 font-serif font-bold text-[#0F172A] mt-1">
            Media
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {list.map((m) =>
            m.kind === 'video' ? (
              <VideoCard key={m.id} item={m} />
            ) : (
              <figure key={m.id} className="rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm">
                <a href={m.url} target="_blank" rel="noopener noreferrer" aria-label={`Open full-size photo: ${m.title || 'Photo'}`} className="block">
                  <SmartImage
                    src={m.url}
                    alt={m.title || 'Photo'}
                    width={800}
                    height={600}
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 92vw"
                    wrapperClassName="aspect-[4/3] w-full"
                    className="w-full h-full aspect-[4/3] object-cover"
                  />
                </a>
                {m.title && <figcaption className="p-4 text-base font-semibold text-[#0F172A]">{m.title}</figcaption>}
              </figure>
            )
          )}
        </div>
      </div>
    </section>
  );
}
