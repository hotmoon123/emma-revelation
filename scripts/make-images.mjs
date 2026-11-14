#!/usr/bin/env node
/**
 * npm run images
 * Reads every .jpg/.jpeg/.png/.webp in /originals (put your full-size photos there, up to 4K or more)
 * and writes AVIF + WebP + JPEG copies at several widths to public/img, plus public/img/manifest.json.
 * It NEVER enlarges a photo: you can only get a real 3840 px copy from an original that is 3840 px or wider.
 * The photo is matched by file name: originals/emma-portrait.jpg serves the site's "/emma-portrait.jpg".
 */
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('The "sharp" package is missing. Run: npm install   (then npm run images again)');
  process.exit(1);
}

const SRC = 'originals';
const OUT = 'public/img';
const WIDTHS = [480, 960, 1440, 1920, 2560, 3840];
const FALLBACK_MAX = 1920;

await mkdir(OUT, { recursive: true });
let files = [];
try {
  files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
} catch {
  /* no folder */
}
if (files.length === 0) {
  console.log(`No photos found in ./${SRC}. Copy your full-size photos there (e.g. originals/emma-portrait.jpg), then run again.`);
  process.exit(0);
}

const manifest = {};
for (const file of files) {
  const key = file.replace(/\.[^.]+$/, '');
  const img = sharp(path.join(SRC, file), { failOn: 'none' }).rotate();
  const meta = await sharp(path.join(SRC, file)).rotate().metadata();
  // .rotate() may swap sides: read real size after orientation
  const buf = await img.toBuffer({ resolveWithObject: true });
  const W = buf.info.width;
  const H = buf.info.height;
  const widths = [...new Set([...WIDTHS.filter((w) => w < W), W])].sort((a, b) => a - b);
  for (const w of widths) {
    const base = sharp(buf.data).resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(OUT, `${key}-${w}.avif`));
    await base.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${key}-${w}.webp`));
  }
  const fbW = Math.min(W, FALLBACK_MAX);
  const fbName = `${key}-${fbW}.jpg`;
  await sharp(buf.data).resize({ width: fbW, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, fbName));
  manifest[key] = { width: W, height: H, widths, formats: ['avif', 'webp'], fallback: `img/${fbName}` };
  console.log(`${file}: original ${W}x${H}${meta.density ? '' : ''} -> widths ${widths.join(', ')}${W < 3840 ? '  (original is below 4K: no 4K copy can be made)' : ''}`);
}
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${OUT}/manifest.json`);
