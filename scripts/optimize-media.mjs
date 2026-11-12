// Turns the original files in media-src/ into web-sized files in public/media/.
// Run with: npm run media
import sharp from 'sharp';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'media-src';
const OUT = 'public/media';
mkdirSync(OUT, { recursive: true });

const jobs = [
  // hero swipe deck (phone screen ~ 300px wide, 2x)
  ...['ruby', 'cargo', 'knit', 'blazer'].map((n) => ({ in: `deck-${n}.jpg`, out: `deck-${n}`, w: 720 })),
  // feature cards
  { in: 'feat-tryon.jpg', out: 'feat-tryon', w: 1400 },
  { in: 'feat-size.jpg', out: 'feat-size', w: 900 },
  { in: 'deck-knit.jpg', out: 'feat-swipe', w: 900 },
  { in: 'feat-curation.jpg', out: 'feat-curation', w: 1400 },
  // try-on looks, front and back
  ...['urban', 'night', 'street', 'sharp'].flatMap((n) => [
    { in: `${n}-front.jpeg`, out: `${n}-front`, w: 700 },
    { in: `${n}-back.jpeg`, out: `${n}-back`, w: 700 },
  ]),
];

for (const j of jobs) {
  const img = sharp(join(SRC, j.in)).rotate().resize({ width: j.w, withoutEnlargement: true });
  await img.webp({ quality: 78 }).toFile(join(OUT, `${j.out}.webp`));
  console.log('img', j.out);
}

// Logo: trim the empty square around the wordmark, then key out its flat background
// so it sits cleanly on any ground (nav blur, white cards, the menu).
{
  const trimmed = await sharp(join(SRC, 'logo-v2.png')).trim({ threshold: 12 }).resize({ height: 96 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = trimmed;
  const bg = [data[0], data[1], data[2]]; // the corner pixel is the background
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const d = Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]));
    const a = Math.min(1, d / 110); // how far from the background this pixel is
    for (let k = 0; k < 3; k++) {
      // un-blend the background so edges keep their true pink
      out[j + k] = a > 0 ? Math.max(0, Math.min(255, Math.round((data[i + k] - bg[k] * (1 - a)) / a))) : 0;
    }
    out[j + 3] = Math.round(a * 255);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(join(OUT, 'logo.png'));
  console.log('logo', info.width, 'x', info.height);
}

// Share card 1200x630 from the brand banner.
if (existsSync(join(SRC, 'banner-v2.png'))) {
  await sharp(join(SRC, 'banner-v2.png')).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 84 }).toFile(join(OUT, 'og.jpg'));
  console.log('og');
}

// App and search icons from the favicon mark; a square logo for Google's knowledge panel.
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(join(SRC, 'favicon.svg'), { density: 600 }).resize(size, size).png().toFile(join('public', file));
}
await sharp(join(SRC, 'logo-v2.png')).resize(512, 512).png().toFile(join(OUT, 'logo-square.png'));
console.log('icons');

// Videos and favicon are copied as they are.
for (const f of ['tryon-1.mp4', 'tryon-2.mp4']) copyFileSync(join(SRC, f), join(OUT, f));
copyFileSync(join(SRC, 'favicon.svg'), 'public/favicon.svg');

// Video posters: the first look photos keep the frames from ever showing empty.
await sharp(join(SRC, 'urban-front.jpeg')).resize(1280, 720, { fit: 'cover', position: 'top' }).webp({ quality: 70 }).toFile(join(OUT, 'tryon-1-poster.webp'));
await sharp(join(SRC, 'street-front.jpeg')).resize(1280, 720, { fit: 'cover', position: 'top' }).webp({ quality: 70 }).toFile(join(OUT, 'tryon-2-poster.webp'));
console.log('done');
