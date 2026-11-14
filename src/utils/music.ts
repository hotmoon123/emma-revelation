import type { MusicalKey } from '../types/music';
import { keyFrequency } from './soundEngine';

/** Seconds per beat. Clamped so a typo (0 or 900 BPM) can never freeze or strobe the UI. */
export function beatSeconds(bpm: number | undefined | null): number {
  const safe = Number.isFinite(bpm) && (bpm as number) > 0 ? (bpm as number) : 72;
  return 60 / Math.min(Math.max(safe, 40), 200);
}

/** Major pentatonic: five notes that never clash, so any tap order sounds musical. */
export const PENTATONIC = [0, 2, 4, 7, 9] as const;
/** Up and back down the scale, so a run of taps sounds like a tune, not a siren. */
const TAP_WALK = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 2] as const;

export function tapSemitone(tapIndex: number): number {
  const i = ((Math.floor(tapIndex) % TAP_WALK.length) + TAP_WALK.length) % TAP_WALK.length;
  return PENTATONIC[TAP_WALK[i]];
}

export function tapFrequency(key: MusicalKey, tapIndex: number): number {
  return keyFrequency(key) * Math.pow(2, tapSemitone(tapIndex) / 12);
}

/** SVG polyline for a sine wave: `periods` full waves across `width`, centred on height/2. */
export function wavePath(periods: number, width: number, height: number, amplitude: number, stepsPerPeriod = 24): string {
  const mid = height / 2;
  const total = Math.max(1, Math.round(periods)) * stepsPerPeriod;
  const pts: string[] = [];
  for (let i = 0; i <= total; i++) {
    const x = (i / total) * width;
    const y = mid - Math.sin((i / stepsPerPeriod) * Math.PI * 2) * amplitude;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Entrance delays (seconds) for cards: long-short-long, not evenly spaced. Repetition with variation. */
export const SWING_DELAYS = [0, 0.14, 0.22, 0.36] as const;
export function swingDelay(index: number): number {
  const i = ((Math.floor(index) % SWING_DELAYS.length) + SWING_DELAYS.length) % SWING_DELAYS.length;
  return SWING_DELAYS[i];
}

/** Semitones of a major chord rising to the octave: root, third, fifth, octave. A small "resolved" sound. */
export const RESOLVE_SEMITONES = [0, 4, 7, 12] as const;

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // Web Audio blocked: the tap still works, it is just silent
  }
}

function pluck(c: AudioContext, freq: number, at: number, peak: number, seconds: number): void {
  const osc = c.createOscillator();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, at);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  osc.start(at);
  osc.stop(at + seconds + 0.05);
}

/** One soft plucked note. Called only after a visitor turned "Tap notes" on and tapped something. */
export function playTapNote(key: MusicalKey, tapIndex: number): void {
  const c = audio();
  if (!c) return;
  pluck(c, tapFrequency(key, tapIndex), c.currentTime, 0.07, 0.45);
}

/** A rising major chord: the page's way of saying "done" (used for a saved reminder). Opt-in only. */
export function playResolve(key: MusicalKey): void {
  const c = audio();
  if (!c) return;
  const root = keyFrequency(key);
  RESOLVE_SEMITONES.forEach((semi, i) => pluck(c, root * Math.pow(2, semi / 12), c.currentTime + i * 0.09, 0.05, 0.7));
}
