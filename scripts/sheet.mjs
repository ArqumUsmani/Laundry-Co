// Contact sheet of raw sprites for a quick visual check: node scripts/sheet.mjs <rawDir> <out.png>
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dir, out] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const cell = 300, cols = 6, rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map(async (f, i) => ({
  input: await sharp(join(dir, f)).resize(cell - 20, cell - 20, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
  left: (i % cols) * cell + 10, top: Math.floor(i / cols) * cell + 10,
})));
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#5b8fb0' } }).composite(tiles).png().toFile(out);
console.log(files.join(' '));
