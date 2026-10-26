/**
 * Keeps the docs honest: every segment key and every article/issue field the
 * code accepts must be mentioned in AUTHORING.md / README.md.
 *   tsx scripts/doc-check.ts
 */
import { readFileSync } from 'node:fs';
import { loadSegments, loadThemes } from '../src/lib/data';

const config = readFileSync('src/content.config.ts', 'utf8');
const authoring = readFileSync('AUTHORING.md', 'utf8');
const readme = readFileSync('README.md', 'utf8');

function fieldsOf(collection: string): string[] {
  const start = config.indexOf(`const ${collection} = defineCollection`);
  const body = config.slice(start, config.indexOf('superRefine', start));
  return [...body.matchAll(/^\s{8}(\w+):/gm)].map((m) => m[1]);
}

const problems: string[] = [];
const need = (doc: string, name: string, word: string) => {
  if (!new RegExp('`' + word + '[`:]').test(doc)) problems.push(`${name} does not mention \`${word}\``);
};
for (const f of fieldsOf('articles')) need(authoring, 'AUTHORING.md', f);
for (const f of fieldsOf('issues')) need(readme, 'README.md', f);
for (const s of loadSegments()) need(authoring, 'AUTHORING.md', s.key);
for (const t of Object.keys(loadThemes())) if (!readme.includes(t)) problems.push(`README.md does not mention theme "${t}"`);
for (const v of ['PUBLIC_KIT_FORM_ID', 'SITE_URL']) need(readme, 'README.md', v);

if (problems.length) {
  console.error(problems.map((p) => `✖ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`✔ Docs mention all ${fieldsOf('articles').length} article fields, ${fieldsOf('issues').length} issue fields, segments, themes and settings.`);
