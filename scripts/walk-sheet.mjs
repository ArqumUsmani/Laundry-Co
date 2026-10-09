// Step 2 of the walk-cycle pipeline: turn a green-screen clip of a character
// walking in place into a looping sprite strip.
//   node scripts/walk-sheet.mjs <clip.mp4> <name> <workDir> [frames=20] [height=480]
// Writes public/img/<name>-walk.webp and prints the metadata the Walker needs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [clip, name, work, framesArg = '20', heightArg = '480'] = process.argv.slice(2);
const FRAMES = Number(framesArg);
const HEIGHT = Number(heightArg);
const dir = join(work, `${name}-frames`);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

// Key on the plate colour as the encoder actually wrote it, not the colour we asked for.
// No despill pass: it reads the cyan clothes as green spill and turns them blue.
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', clip, '-frames:v', '1', join(dir, 'probe.png')]);
const probe = await sharp(join(dir, 'probe.png')).extract({ left: 4, top: 4, width: 24, height: 24 }).resize(1, 1).raw().toBuffer();
const key = `0x${[...probe.subarray(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
rmSync(join(dir, 'probe.png'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', clip, '-vf', `chromakey=${key}:0.11:0.05`, '-pix_fmt', 'rgba', join(dir, '%03d.png')]);
const fps = Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', clip]).toString().trim().split('/').reduce((a, b) => a / b));

const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const frames = [];
for (const file of files) {
  const { data, info } = await sharp(join(dir, file)).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let left = width, right = 0, top = height, bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 60) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  // Anchor on the head and torso, which do not swing; the legs would skew the centre.
  const torsoEnd = top + (bottom - top) * 0.45;
  let sum = 0, count = 0;
  for (let y = top; y < torsoEnd; y++) {
    for (let x = left; x <= right; x++) {
      if (data[(y * width + x) * 4 + 3] > 60) { sum += x; count++; }
    }
  }
  // How far apart the feet are: the widest run of the lowest rows.
  const feetStart = Math.round(bottom - (bottom - top) * 0.07);
  let feetLeft = width, feetRight = 0;
  for (let y = feetStart; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (data[(y * width + x) * 4 + 3] > 60) {
        if (x < feetLeft) feetLeft = x;
        if (x > feetRight) feetRight = x;
      }
    }
  }
  frames.push({ file, width, height, left, right, top, bottom, cx: sum / count, spread: feetRight - feetLeft, data });
}

// A small picture of each frame's lower body, centred on the torso, to compare poses.
const SIG = 48;
async function signature(f) {
  const size = Math.round((f.bottom - f.top) * 0.62);
  const left = Math.max(0, Math.min(f.width - size, Math.round(f.cx - size / 2)));
  const top = Math.max(0, Math.min(f.height - size, f.bottom - size));
  return sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
    .extract({ left, top, width: size, height: size })
    .flatten({ background: '#808080' })
    .resize(SIG, SIG, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
}
const sigs = await Promise.all(frames.map(signature));
const diff = (a, b) => {
  let total = 0;
  for (let i = 0; i < sigs[a].length; i++) total += Math.abs(sigs[a][i] - sigs[b][i]);
  return total / sigs[a].length;
};

// Find the full gait cycle: the lag at which the clip best repeats itself, then
// the start frame whose match one cycle later is closest. Skip the first moments
// while the character is still getting going.
const settle = Math.round(fps * 0.7);
let best = { score: Infinity, lag: 0 };
const lagScores = [];
for (let lag = Math.round(fps * 0.6); lag <= Math.round(fps * 1.9) && settle + lag < frames.length - 1; lag++) {
  let total = 0, n = 0;
  for (let a = settle; a + lag < frames.length; a++) { total += diff(a, a + lag); n++; }
  const score = total / n;
  lagScores.push(`${lag}:${score.toFixed(1)}`);
  if (score < best.score) best = { score, lag };
}
let start = settle, startScore = Infinity;
for (let a = settle; a + best.lag < frames.length; a++) {
  const score = diff(a, a + best.lag);
  if (score < startScore) { startScore = score; start = a; }
}

// Begin the loop on the widest stride, so frame 0 and the halfway frame are both planted poses.
let cycle = Array.from({ length: best.lag }, (_, i) => frames[start + i]);
const widest = cycle.reduce((bestIndex, f, i) => (f.spread > cycle[bestIndex].spread ? i : bestIndex), 0);
cycle = [...cycle.slice(widest), ...cycle.slice(0, widest)];
const picked = Array.from({ length: FRAMES }, (_, i) => cycle[Math.round((i * cycle.length) / FRAMES) % cycle.length]);

// One cell size for every frame: wide enough for the biggest swing either side of the torso.
const ground = Math.max(...picked.map((f) => f.bottom));
const head = Math.min(...picked.map((f) => f.top));
const reachLeft = Math.max(...picked.map((f) => f.cx - f.left));
const reachRight = Math.max(...picked.map((f) => f.right - f.cx));
const pad = 6;
const cellW = Math.ceil(reachLeft + reachRight) + pad * 2;
const cellH = ground - head + pad * 2;
const scale = HEIGHT / cellH;
const outW = Math.round(cellW * scale);

const cells = await Promise.all(
  picked.map(async (f) => {
    const left = Math.round(f.cx - reachLeft) - pad;
    const top = head - pad;
    // Pad first so a cell that pokes past the frame edge still extracts cleanly.
    const margin = 240;
    const padded = await sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
      .extend({ top: margin, bottom: margin, left: margin, right: margin, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const placed = await sharp(padded).extract({ left: left + margin, top: top + margin, width: cellW, height: cellH }).png().toBuffer();
    return sharp(placed).resize(outW, HEIGHT, { fit: 'fill' }).png().toBuffer();
  }),
);

await sharp({ create: { width: outW * FRAMES, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(cells.map((input, i) => ({ input, left: i * outW, top: 0 })))
  .webp({ quality: 80, alphaQuality: 88, effort: 6 })
  .toFile(`public/img/${name}-walk.webp`);

// Preview on a mid blue so the edges can be judged.
await sharp({ create: { width: outW * 10, height: HEIGHT * Math.ceil(FRAMES / 10), channels: 4, background: '#5b8fb0' } })
  .composite(cells.map((input, i) => ({ input, left: (i % 10) * outW, top: Math.floor(i / 10) * HEIGHT })))
  .png()
  .toFile(join(work, `${name}-preview.png`));

const spreads = picked.map((f) => f.spread);
const step = (Math.max(...spreads) - Math.min(...spreads)) / cellH;
console.log(JSON.stringify({
  name, key, fps, sourceFrames: frames.length, cycleFrames: best.lag, cycleSeconds: +(best.lag / fps).toFixed(2),
  loopMismatch: +startScore.toFixed(1), frames: FRAMES, cell: [outW, HEIGHT], aspect: +(outW / HEIGHT).toFixed(4),
  // Ground covered per full cycle (two steps), as a fraction of the character's height.
  stride: +(step * 2).toFixed(3),
  // Feet-together frames, one per half cycle: the poses to settle on when standing still.
  rest: [spreads.indexOf(Math.min(...spreads.slice(0, FRAMES / 2))), FRAMES / 2 + spreads.slice(FRAMES / 2).indexOf(Math.min(...spreads.slice(FRAMES / 2)))],
}));
console.log('lag scores', lagScores.join(' '));
