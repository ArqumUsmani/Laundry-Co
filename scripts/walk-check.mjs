// Visual check of the walk cycles: stacks a burst of hero screenshots so leg
// movement can be compared frame to frame.
//   node scripts/walk-check.mjs <out.png> [url]
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const out = process.argv[2];
const url = process.argv[3] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('#splash', { state: 'detached', timeout: 12000 });
await page.waitForTimeout(3200);

const clip = { x: 0, y: 330, width: 1440, height: 500 };
const shots = [];
for (let i = 0; i < 6; i++) {
  shots.push(await page.screenshot({ clip }));
  await page.waitForTimeout(170);
}
console.log('walking now:', await page.evaluate(() => [...document.querySelectorAll('.walker-strip')].map((s) => s.style.transform)));
await sharp({ create: { width: clip.width, height: clip.height * shots.length, channels: 3, background: '#000' } })
  .composite(shots.map((input, i) => ({ input, left: 0, top: i * clip.height })))
  .png()
  .toFile(out);
await browser.close();
