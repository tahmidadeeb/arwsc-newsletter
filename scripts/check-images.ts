/**
 * Runs after `astro build`. Fails the build if any page refers to an image
 * that is not in the output folder.
 *   tsx scripts/check-images.ts [dist-dir]
 */
import { checkImages } from '../src/lib/check-images';

const dir = process.argv[2] ?? 'dist';
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:4321');
const { checked, missing } = checkImages(dir, site);
if (missing.length) {
  console.error(`\n✖  Image check: ${missing.length} of ${checked} image links point to files that do not exist:\n`);
  for (const m of missing) console.error(`   ${m.page}  →  ${m.url}`);
  console.error('\n   The live site has not changed. Check the image paths in the articles listed above.\n');
  process.exit(1);
}
console.log(`✔  Image check: ${checked} image links checked, 0 missing.`);
