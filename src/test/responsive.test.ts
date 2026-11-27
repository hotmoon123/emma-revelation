import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Source files under src/ (tests excluded). */
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'test' ? [] : files(p);
    return /\.(tsx|ts|css)$/.test(f) ? [p] : [];
  });
const sources = files('src').filter((f) => !f.endsWith('App.css')); // App.css is unused Vite starter leftover

describe('responsive rules (rem, not px)', () => {
  it('no text size or touch-target size is written in px', () => {
    const bad: string[] = [];
    for (const f of sources) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/text-\[\d+(\.\d+)?px\]|min-[hw]-\[\d+px\]|(?<!\()min-(height|width):\s*\d+px/.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('headings use the fluid scale', () => {
    const pub = readFileSync('src/components/PublicWebsite.tsx', 'utf8');
    expect(pub).toContain('text-fluid-hero');
    expect(pub).toContain('text-fluid-h2');
  });

  it('the container-queries plugin is registered', () => {
    expect(readFileSync('tailwind.config.js', 'utf8')).toContain('container-queries');
  });
});
