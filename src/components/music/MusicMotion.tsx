import React, { useMemo } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { wavePath } from '../../utils/music';

/*
 * "Feel of music" kit. Everything here is decoration: aria-hidden, no pointer events, no text,
 * only the White & Blue tokens. Motion is driven by CSS and keeps time with the current track:
 * the parent sets --beat (seconds per beat). The hero "Pause animation" button sets
 * data-motion="paused" on the page, and the OS reduced-motion setting is honoured in index.css.
 */

const EQ_SHAPE = [0.45, 0.85, 0.6, 1, 0.7]; // resting heights, so a stopped equalizer still looks like one
const EQ_BEATS = [1, 1.5, 0.75, 2, 1.25]; // each bar loops over a different number of beats: no two bars move in lock-step

/** Equalizer bars. Moves in time with the beat while playing; rests in a fixed shape otherwise. */
export const Equalizer: React.FC<{ playing: boolean; className?: string }> = ({ playing, className = '' }) => (
  <span className={`mu-eq ${playing ? 'is-playing' : ''} ${className}`} aria-hidden="true">
    {EQ_SHAPE.map((s, i) => (
      <span key={i} style={{ ['--s' as string]: s, ['--i' as string]: i, ['--m' as string]: EQ_BEATS[i] } as React.CSSProperties} />
    ))}
  </span>
);

/** Three sound waves along the bottom of the hero. They swell and drift while music plays. */
export const SoundWaves: React.FC<{ playing: boolean }> = ({ playing }) => {
  const d = useMemo(
    () => [wavePath(8, 2400, 96, 26), wavePath(12, 2400, 96, 16), wavePath(6, 2400, 96, 34)],
    [],
  );
  const layers = [
    { stroke: '#2563EB', opacity: 0.55, cls: 'mu-wave-a' },
    { stroke: '#94A3B8', opacity: 0.55, cls: 'mu-wave-b' },
    { stroke: '#2563EB', opacity: 0.22, cls: 'mu-wave-c' },
  ];
  return (
    <div className={`mu-waves ${playing ? 'is-playing' : ''}`} aria-hidden="true">
      {layers.map((l, i) => (
        <div key={i} className={`mu-wave ${l.cls}`}>
          <svg viewBox="0 0 2400 96" preserveAspectRatio="none" focusable="false">
            <path d={d[i]} fill="none" stroke={l.stroke} strokeOpacity={l.opacity} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </div>
  );
};

/** A silver-and-blue record peeking out from behind the portrait. Spins while music plays. */
export const Vinyl: React.FC<{ playing: boolean }> = ({ playing }) => (
  <div className={`mu-vinyl ${playing ? 'is-playing' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 200 200" focusable="false">
      <circle cx="100" cy="100" r="98" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
      {[88, 80, 72, 64, 56, 48].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#94A3B8" strokeOpacity="0.45" strokeWidth="0.8" />
      ))}
      {/* two opposite sheen wedges: they make the spin visible */}
      <path d="M100 100 L100 4 A96 96 0 0 1 150 17 Z" fill="#FFFFFF" fillOpacity="0.9" />
      <path d="M100 100 L100 196 A96 96 0 0 1 50 183 Z" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="100" cy="100" r="32" fill="#2563EB" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1" />
      <rect x="97.5" y="76" width="5" height="12" rx="2.5" fill="#FFFFFF" />
      <circle cx="100" cy="100" r="4" fill="#FFFFFF" />
    </svg>
  </div>
);

/** Five staff lines with a few notes: a quiet marker next to the "Music" heading. */
export const Staff: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 168 44" width="168" height="44" aria-hidden="true" focusable="false">
    {[2, 12, 22, 32, 42].map((y) => (
      <line key={y} x1="0" x2="168" y1={y} y2={y} stroke="#94A3B8" strokeOpacity="0.55" strokeWidth="1" />
    ))}
    {[
      { x: 26, y: 32 },
      { x: 62, y: 22 },
      { x: 98, y: 12 },
      { x: 134, y: 22 },
    ].map((n, i) => (
      <g key={i}>
        <ellipse cx={n.x} cy={n.y} rx="6" ry="4.5" transform={`rotate(-20 ${n.x} ${n.y})`} fill="#2563EB" />
        {n.y > 17 ? (
          <line x1={n.x + 5.2} x2={n.x + 5.2} y1={n.y - 1} y2={n.y - 24} stroke="#2563EB" strokeWidth="1.6" />
        ) : (
          <line x1={n.x - 5.2} x2={n.x - 5.2} y1={n.y + 1} y2={n.y + 24} stroke="#2563EB" strokeWidth="1.6" />
        )}
      </g>
    ))}
  </svg>
);

/** A playhead along the bottom edge of the header: how far through the page you are, like a track. */
export const Playhead: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: x }}
      className="absolute left-0 right-0 -bottom-px h-[3px] origin-left bg-[#2563EB] pointer-events-none"
    />
  );
};
