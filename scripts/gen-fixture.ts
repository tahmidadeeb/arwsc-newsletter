/**
 * Generates a test content folder (never published).
 *
 *   tsx scripts/gen-fixture.ts <out-dir> <issue-folder> feature=3 opinion=7 frontier=4 \
 *       [announcements=2] [--long] [--authors=9] [--featured=2] [--theme=cobalt] [--images]
 *
 * Can be called several times on the same out-dir to add more issues.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [out, folder, ...rest] = process.argv.slice(2);
if (!out || !folder) {
  console.error('usage: gen-fixture <out-dir> <YYYY-MM> segment=count … [--long] [--authors=N] [--featured=N] [--theme=name] [--images] [--number=N]');
  process.exit(2);
}
const flags = Object.fromEntries(
  rest.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? 'true'];
  }),
);
const counts = rest
  .filter((a) => !a.startsWith('--'))
  .map((a) => a.split('='))
  .map(([k, v]) => [k, Number(v)] as const);

const WORDS = ['river', 'microbes', 'signal', 'lattice', 'protein', 'monsoon', 'archive', 'enzyme', 'orbit', 'delta',
  'neuron', 'silt', 'quantum', 'fever', 'ledger', 'soil', 'genome', 'tide', 'circuit', 'spore', 'atlas', 'resistance'];
const NAMES = ['Ana Rahman', 'Bo Chen', 'Chidi Okafor', 'Dilnaz Akter', 'Esra Yilmaz', 'Farhan Hossain', 'Grace Mbeki',
  'Hiroshi Tanaka', 'Ishita Sen', 'José Álvarez', 'Kamal Uddin', 'Lena Novak'];

let seed = folder.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const q = (s: string) => `"${s.replace(/"/g, '\\"')}"`;

function title(long: boolean): string {
  const n = long ? 18 : 3 + Math.floor(rnd() * 5);
  return cap(Array.from({ length: n }, () => pick(WORDS)).join(' '));
}
function para(n = 3): string {
  return Array.from({ length: n }, () => cap(Array.from({ length: 14 + Math.floor(rnd() * 10) }, () => pick(WORDS)).join(' ')) + '.').join(' ');
}

const root = join(out, folder);
mkdirSync(root, { recursive: true });
const issueFm = [
  `issueNumber: ${flags.number ?? Number(folder.slice(5))}`,
  `title: ${q(flags.title ?? `Fixture issue ${folder}`)}`,
  flags.theme ? `theme: ${flags.theme}` : '',
].filter(Boolean);
writeFileSync(join(root, 'issue.md'), `---\n${issueFm.join('\n')}\n---\n${flags.note ? para(2) + '\n' : ''}`);

let featuredLeft = Number(flags.featured ?? 0);
let i = 0;
for (const [segment, count] of counts) {
  for (let k = 1; k <= count; k++) {
    i++;
    const slug = `${segment}-${String(k).padStart(2, '0')}`;
    const dir = join(root, slug);
    mkdirSync(join(dir, 'images'), { recursive: true });
    const authorCount = Number(flags.authors ?? 1 + Math.floor(rnd() * 2));
    const authors = Array.from({ length: authorCount }, (_, j) => NAMES[(i + j) % NAMES.length]);
    const fm: string[] = [
      `title: ${q(title(flags.long === 'true' && k % 3 === 1))}`,
      `authors:\n${authors.map((a) => `  - ${a}`).join('\n')}`,
      `segment: ${segment}`,
      `date: ${folder}-${String(1 + (k % 27)).padStart(2, '0')}`,
      `summary: ${q(para(1))}`,
      `order: ${k}`,
    ];
    if (k % 2 === 0) fm.push(`dek: ${q(para(1).slice(0, 140))}`);
    if (featuredLeft > 0) {
      fm.push('featured: true');
      featuredLeft--;
    }
    const paras = Number(flags.paras ?? 2);
    let body = Array.from({ length: paras }, (_, j) => (j % 5 === 4 ? `## ${title(false)}\n\n` : '') + para(3 + (j % 3))).join('\n\n') + '\n';
    if (flags.images === 'true' && k === 1) {
      await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#2b5d7a' } }).jpeg().toFile(join(dir, 'images', 'figure-one.jpg'));
      fm.push('heroImage: images/figure-one.jpg', `heroAlt: ${q('A blue test image')}`);
      body += '\n![A blue test image](images/figure-one.jpg "Test figure | Fixture")\n';
    }
    writeFileSync(join(dir, `${slug}.md`), `---\n${fm.join('\n')}\n---\n${body}`);
  }
}
console.log(`wrote ${i} articles to ${root}`);
