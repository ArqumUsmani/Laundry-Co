// Trim, resize and convert raw sprite renders to WebP: node scripts/assets.mjs <rawDir>
// Sizes are 2x the largest size each sprite is ever displayed at, so nothing is upscaled.
// The three walking characters are built separately: see walk-plate.mjs and walk-sheet.mjs.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const raw = process.argv[2];
const out = 'public/img';
mkdirSync(out, { recursive: true });

const sizes = {
  scooter: { width: 640 }, sofa: { width: 760 }, cat: { width: 320 },
  plant: { height: 680 }, planter: { width: 640 }, tree: { height: 1200 },
  basket: { width: 480 }, tshirt: { width: 400 }, sock: { width: 400 },
  kurta: { width: 400 }, jeans: { width: 400 }, towels: { width: 560 },
  iron: { width: 640 }, suit: { height: 800 }, shirt: { width: 900 },
};

const report = {};
for (const [name, size] of Object.entries(sizes)) {
  const trimmed = await sharp(join(raw, `${name}.png`)).trim({ threshold: 8 }).toBuffer();
  const info = await sharp(trimmed)
    .resize({ ...size, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 })
    .toFile(join(out, `${name}.webp`));
  report[name] = [info.width, info.height, Math.round(info.size / 1024) + 'kB'];
}
console.log(JSON.stringify(report));
