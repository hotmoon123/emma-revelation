/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beatSeconds, PENTATONIC, RESOLVE_SEMITONES, swingDelay, SWING_DELAYS, tapFrequency, tapSemitone, wavePath } from '../utils/music';

describe('beatSeconds', () => {
  it('turns BPM into seconds per beat', () => {
    expect(beatSeconds(60)).toBeCloseTo(1, 5);
    expect(beatSeconds(120)).toBeCloseTo(0.5, 5);
  });
  it('clamps typos and falls back for missing values', () => {
    expect(beatSeconds(0)).toBeCloseTo(60 / 72, 5);
    expect(beatSeconds(undefined)).toBeCloseTo(60 / 72, 5);
    expect(beatSeconds(900)).toBeCloseTo(0.3, 5); // never faster than 200 BPM
    expect(beatSeconds(5)).toBeCloseTo(1.5, 5); // never slower than 40 BPM
  });
});

describe('tap notes', () => {
  it('only ever uses notes of the major pentatonic scale', () => {
    for (let i = -30; i < 60; i++) expect(PENTATONIC).toContain(tapSemitone(i));
  });
  it('starts on the key root and stays in tune with it', () => {
    expect(tapFrequency('C', 0)).toBeCloseTo(261.63, 2);
    expect(tapFrequency('A', 0)).toBeCloseTo(440, 2);
    expect(tapFrequency('C', 2)).toBeCloseTo(261.63 * Math.pow(2, 4 / 12), 2); // third degree = major third
  });
});

describe('wavePath', () => {
  it('draws the requested number of periods and stays inside the box', () => {
    const d = wavePath(4, 400, 100, 20, 8);
    const pts = d.split(' ');
    expect(pts).toHaveLength(4 * 8 + 1);
    expect(pts[0]).toBe('M0.0,50.0');
    expect(pts[pts.length - 1]).toBe('L400.0,50.0'); // whole periods: ends where it began, so the loop is seamless
    const ys = pts.map((p) => Number(p.slice(1).split(',')[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(70);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(30);
  });
});

describe('rhythm is repetition with variation', () => {
  it('card entrances are staggered but not evenly spaced (not a metronome)', () => {
    const gaps = SWING_DELAYS.slice(1).map((d, i) => +(d - SWING_DELAYS[i]).toFixed(3));
    expect(new Set(gaps).size).toBeGreaterThan(1);
    expect(swingDelay(0)).toBe(0);
    expect(swingDelay(SWING_DELAYS.length)).toBe(0); // the pattern repeats
    expect(swingDelay(-1)).toBe(SWING_DELAYS[SWING_DELAYS.length - 1]);
  });
  it('the "done" sound is a rising major chord to the octave', () => {
    expect([...RESOLVE_SEMITONES]).toEqual([0, 4, 7, 12]);
  });
});

/** Returns { name -> declaration property names } for every @keyframes mu-* block (brace-balanced). */
function musicKeyframes(css: string): Record<string, string[]> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Record<string, string[]> = {};
  for (const m of clean.matchAll(/@keyframes (mu-[\w-]+)\s*\{/g)) {
    let depth = 1;
    let i = (m.index ?? 0) + m[0].length;
    const start = i;
    while (i < clean.length && depth > 0) {
      if (clean[i] === '{') depth++;
      if (clean[i] === '}') depth--;
      i++;
    }
    const body = clean.slice(start, i - 1);
    out[m[1]] = [...body.matchAll(/([a-z-]+)\s*:[^;{}]+;/g)].map((x) => x[1]);
  }
  return out;
}

describe('music animations are cheap', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const frames = musicKeyframes(css);
  it('finds the music keyframes', () => {
    expect(Object.keys(frames).sort()).toEqual(['mu-drift', 'mu-eq', 'mu-ring', 'mu-spin', 'mu-swell']);
  });
  it('animate only transform and opacity (design-system motion rule: GPU friendly)', () => {
    for (const [name, props] of Object.entries(frames)) {
      expect(props.length, name).toBeGreaterThan(0);
      for (const prop of props) expect(['transform', 'opacity'], `${name} uses ${prop}`).toContain(prop);
    }
  });
  it('honours reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.mu-wave/);
  });
});
