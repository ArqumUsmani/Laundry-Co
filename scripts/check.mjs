// Interaction checks: node scripts/check.mjs <outDir> [url]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2];
const url = process.argv[3] ?? 'http://localhost:5173/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

async function open(options) {
  const context = await browser.newContext({ deviceScaleFactor: 2, ...options });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#splash', { state: 'detached', timeout: 12000 });
  await page.waitForTimeout(1500);
  return page;
}
const scrollTo = (page, selector) => page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), selector);

// Desktop, dark: iron play, flip card, header, full house.
let page = await open({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
await scrollTo(page, '.press-stage');
await page.waitForTimeout(900);
await page.locator('.press-stage').click();
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/press-mid.png` });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}/press-done.png` });
await scrollTo(page, '.services');
await page.waitForTimeout(900);
await page.locator('.flip').nth(3).click();
await page.locator('.flip').nth(1).click();
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/flip.png` });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(900);
await page.evaluate(() => document.querySelectorAll('.machine').forEach((m) => m.click()));
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}/all-washing.png` });
await page.waitForTimeout(6800);
await page.screenshot({ path: `${out}/poppers.png` });
await page.waitForTimeout(4000);
console.log('leftover fx nodes:', await page.evaluate(() => document.querySelectorAll('.fx > *, .poppers').length));
await page.context().close();

// Phone, light: header fits, last button inside the viewport.
page = await open({ viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true });
await scrollTo(page, '.services');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/phone-header.png` });
console.log('header right edge:', await page.evaluate(() => Math.round(document.querySelector('.header-actions').lastElementChild.getBoundingClientRect().right)), 'of 390');
await page.locator('.walker-hit').first().evaluate((el) => el.click());
await page.context().close();

// Reduced motion: the outcome without the show.
page = await open({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
await page.locator('.machine').nth(6).evaluate((el) => el.click());
await page.waitForTimeout(400);
console.log('reduced motion display:', await page.locator('.m-display').nth(6).textContent(), '| live:', await page.locator('#live-region').textContent());
await page.screenshot({ path: `${out}/reduced.png` });
await page.context().close();
await browser.close();
