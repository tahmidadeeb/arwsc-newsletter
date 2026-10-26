/**
 * Local QA (not run on Vercel): full-page screenshots at phone and desktop
 * widths. Run against `npx astro preview`.
 *   tsx scripts/screenshots.ts http://localhost:4321 test-output/shots / /issues/ …
 * Set CHROME_PATH if Playwright's own browser is not installed.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [base = 'http://localhost:4321', out = 'test-output/shots', ...paths] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
for (const p of paths.length ? paths : ['/']) {
  for (const [w, h, tag] of [[390, 844, 'mobile'], [1440, 900, 'desktop']] as const) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    const name = `${out}/${p.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home'}-${tag}.png`;
    await page.screenshot({ path: name, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`${overflow ? '✖ horizontal scroll' : '✔'} ${name}`);
    await page.close();
  }
}
await browser.close();
