/**
 * Runs before every build (npm run build). Prints problems in plain language
 * and stops the build if anything must be fixed. On Vercel a stopped build
 * never replaces the live site.
 */
import { contentDir } from '../src/lib/content-dir';
import { formatReport, validateContent } from '../src/lib/validate';

const dir = contentDir();
const report = await validateContent(dir);
console.log(`\nChecking content in ${dir} …\n`);
console.log(formatReport(report));
console.log('');
process.exit(report.errors.length ? 1 : 0);
