/**
 * Local QA (not run on Vercel): opens pages of the production preview in a
 * real browser and confirms every image actually loaded.
 *
 *   npm run build && npx astro preview   (in another terminal)
 *   tsx scripts/qa-images.ts http://localhost:4321 /issues/2026-09/what-the-river-remembers/ …
 *
 * Set CHROME_PATH if Playwright's own browser is not installed.
 */
import { chromium } from 'playwright';

const [base = 'http://localhost:4321', ...paths] = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
let failed = 0;
for (const path of paths) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForLoadState('networkidle');
  const imgs = await page.$$eval('img', (els) =>
    els.map((e) => ({ src: e.currentSrc || e.src, ok: e.complete && e.naturalWidth > 0 })),
  );
  const bad = imgs.filter((i) => !i.ok);
  failed += bad.length;
  console.log(`${bad.length ? '✖' : '✔'} ${path}: ${imgs.length - bad.length}/${imgs.length} images loaded`);
  for (const b of bad) console.log(`    not loaded: ${b.src}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
