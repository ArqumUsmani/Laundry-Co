// Screenshot the running site for a visual check:
//   node scripts/shots.mjs <outDir> [url]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2];
const url = process.argv[3] ?? 'http://localhost:5173/';
mkdirSync(out, { recursive: true });

const sizes = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const browser = await chromium.launch({ channel: 'chrome' });

for (const [name, viewport] of Object.entries(sizes)) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: theme, isMobile: name === 'phone', hasTouch: name === 'phone' });
    const page = await context.newPage();
    page.on('console', (m) => m.type() === 'error' && console.log(`[${name}/${theme}] console:`, m.text()));
    page.on('pageerror', (e) => console.log(`[${name}/${theme}] pageerror:`, e.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${out}/${name}-${theme}-splash.png` });
    await page.waitForSelector('#splash', { state: 'detached', timeout: 12000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/${name}-${theme}-hero.png` });

    // Run a machine and catch it mid-wash, then finished.
    await page.locator('.machine').nth(5).click({ force: true });
    await page.waitForTimeout(4200);
    await page.screenshot({ path: `${out}/${name}-${theme}-wash.png` });
    await page.waitForTimeout(6500);
    await page.screenshot({ path: `${out}/${name}-${theme}-fresh.png` });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`[${name}/${theme}] horizontal overflow: ${overflow}px`);

    // Walk down the page so every reveal fires, then capture it whole.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += viewport.height * 0.6) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${name}-${theme}-full.png`, fullPage: true });
    await context.close();
  }
}
await browser.close();
