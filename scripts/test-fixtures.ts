/**
 * Stress test: builds every fixture in tests/fixtures (never published) and
 * checks that each renders sensibly; confirms broken content is rejected;
 * confirms the site still builds after the sample content is deleted.
 *
 *   npm run test:fixtures
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { checkImages } from '../src/lib/check-images';
import { article, ISSUE_MD, makeContent, oneArticle } from '../tests/helpers/content';

const ROOT = resolve('.');
const OUT = join(ROOT, 'test-output', 'fixtures');
let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`  ${cond ? '✔' : '✖'} ${msg}`);
  if (!cond) failures++;
};

function run(cmd: string, args: string[], env: Record<string, string>, cwd = ROOT) {
  return spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8' });
}

function build(name: string, contentDir: string, cwd = ROOT) {
  const out = join(OUT, name);
  rmSync(out, { recursive: true, force: true });
  const env = { NEWSLETTER_CONTENT_DIR: contentDir, SITE_URL: 'https://fixture.example' };
  const v = run('npx', ['tsx', 'scripts/validate.ts'], env, cwd);
  const b = v.status === 0 ? run('npx', ['astro', 'build', '--outDir', out], env, cwd) : v;
  const page = (p: string): HTMLElement | null => {
    const f = join(out, p, 'index.html');
    return existsSync(f) ? parse(readFileSync(f, 'utf8')) : null;
  };
  return { out, validateLog: v.stdout + v.stderr, status: b.status, buildLog: (b.stdout ?? '') + (b.stderr ?? ''), page };
}

function imagesOk(out: string) {
  const r = checkImages(out, 'https://fixture.example');
  return r.missing.length === 0;
}

const text = (el: HTMLElement | null) => el?.text ?? '';

// ---------------------------------------------------------------- valid fixtures
console.log('\nValid fixtures (must build and render sensibly)');

{
  const r = build('minimal', 'tests/fixtures/minimal');
  console.log(' minimal');
  ok(r.status === 0, 'builds');
  ok(!!r.page('issues/2026-01/only-article'), 'article page exists');
  ok(text(r.page('')).includes('The only article'), 'home shows the article as lead');
  ok((r.page('')?.querySelectorAll('.seg') ?? []).length === 0, 'no empty segment headings on home (the lead is the only article)');
  ok(imagesOk(r.out), 'all image links resolve');
}
{
  const r = build('empty', 'tests/fixtures/empty');
  console.log(' empty (issue with no articles)');
  ok(r.status === 0, 'builds');
  ok(text(r.page('issues/2026-02')).includes('on their way'), 'issue page explains articles are on their way');
  ok((r.page('issues/2026-02')?.querySelectorAll('.seg, .toc') ?? []).length === 0, 'no segment or contents headings');
  ok(r.validateLog.includes('no articles'), 'validator warns about the empty issue');
  ok(imagesOk(r.out), 'all image links resolve');
}
{
  const r = build('heavy', 'tests/fixtures/heavy');
  console.log(' heavy (33 articles, 32 in one segment, long titles, 9 authors, 3 featured)');
  ok(r.status === 0, 'builds');
  const issue = r.page('issues/2026-04');
  const opinionItems = issue?.querySelectorAll('#opinion .op, #opinion .ci') ?? [];
  // lead is excluded from its segment block on the issue page
  ok(opinionItems.length === 31 || opinionItems.length === 32, `opinion section lists every piece (${opinionItems.length})`);
  ok((issue?.querySelectorAll('.toc__item') ?? []).length === 33, 'contents lists all 33 articles');
  ok(r.validateLog.includes('featured'), 'validator warns about several featured articles');
  const art = r.page('issues/2026-04/opinion-01');
  ok(text(art).includes('others') || text(art).includes(' and '), 'long author list renders');
  ok(imagesOk(r.out), 'all image links resolve');
}
{
  const r = build('sparse', 'tests/fixtures/sparse');
  console.log(' sparse (only The Frontier)');
  ok(r.status === 0, 'builds');
  const heads = (r.page('issues/2026-05')?.querySelectorAll('.seg__h') ?? []).map((h) => h.text);
  ok(heads.length === 1 && heads[0] === 'The Frontier', `only "The Frontier" heading (${heads.join(', ')})`);
  ok(imagesOk(r.out), 'all image links resolve');
}
{
  const r = build('partial-theme', 'tests/fixtures/partial-theme');
  console.log(' partial-theme (light accent only)');
  ok(r.status === 0, 'builds');
  ok(/too light to use as text/.test(r.validateLog), 'validator warns and suggests a darker accent');
  const style = r.page('issues/2026-03')?.querySelector('html')?.getAttribute('style') ?? '';
  const accent = /--accent:([^;]+)/.exec(style)?.[1];
  const accentText = /--accent-text:([^;]+)/.exec(style)?.[1];
  ok(!!accent && !!accentText && accent !== accentText, `link colour darkened (${accent} → ${accentText})`);
  ok(imagesOk(r.out), 'all image links resolve');
}
{
  const r = build('no-issues', 'tests/fixtures/no-issues');
  console.log(' no-issues');
  ok(r.status === 0, 'builds');
  ok(text(r.page('')).includes('in preparation'), 'home shows the first-issue state');
  ok((r.page('issues')?.querySelectorAll('.tile') ?? []).length === 0, 'archive has no cards');
  ok(imagesOk(r.out), 'all image links resolve');
}

// ---------------------------------------------------------------- broken content
console.log('\nBroken content (validator must stop the build with a clear message)');
const broken: [string, () => Promise<string>, string][] = [
  ['unknown segment', () => oneArticle(article({ segment: 'sports' })), 'does not exist'],
  ['HEIC image', () => oneArticle(article({}, '![a](images/p.heic)'), { '2026-10/my-article/images/p.heic': 'x' }), 'HEIC'],
  ['wrong capitals', () => oneArticle(article({}, '![a](images/Photo.jpg)'), { '2026-10/my-article/images/photo.jpg': { image: [100, 100] } }), 'capital letters'],
  ['unquoted colon', () => oneArticle(article({ title: 'Cells: a story' })), 'put the title in quotes'],
  ['external image', () => oneArticle(article({}, '![a](https://x.org/a.jpg)')), 'web address'],
  ['missing issue.md', () => makeContent({ '2026-10/a/a.md': article() }), 'issue.md'],
];
for (const [name, make, expect] of broken) {
  const dir = await make();
  const v = run('npx', ['tsx', 'scripts/validate.ts'], { NEWSLETTER_CONTENT_DIR: dir });
  ok(v.status === 1 && (v.stdout + v.stderr).includes(expect), `${name}: exit 1 with "${expect}"`);
}

// ---------------------------------------------------------------- deleting the samples
console.log('\nDeleting the sample content');
{
  const copy = mkdtempSync(join(tmpdir(), 'arwsc-del-'));
  for (const f of readdirSync(ROOT)) {
    if (['node_modules', 'dist', 'test-output', '.git', '.astro', '.superpowers'].includes(f)) continue;
    cpSync(join(ROOT, f), join(copy, f), { recursive: true });
  }
  execFileSync('ln', ['-s', join(ROOT, 'node_modules'), join(copy, 'node_modules')]);
  for (const d of readdirSync(join(copy, 'src/content/issues'))) rmSync(join(copy, 'src/content/issues', d), { recursive: true, force: true });
  const b = run('npm', ['run', '-s', 'build'], {}, copy);
  ok(b.status === 0, 'npm run build succeeds with no issues at all');
  const home = existsSync(join(copy, 'dist/index.html')) ? readFileSync(join(copy, 'dist/index.html'), 'utf8') : '';
  ok(home.includes('in preparation'), 'home shows the first-issue state');
  rmSync(copy, { recursive: true, force: true });
}

console.log(failures ? `\n✖ ${failures} check(s) failed\n` : '\n✔ All fixture checks passed\n');
process.exit(failures ? 1 : 0);
