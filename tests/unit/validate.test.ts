import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/lib/validate';
import { article, ISSUE_MD, makeContent, oneArticle } from '../helpers/content';

const A = '2026-10/my-article';
const img = { image: [800, 600] as [number, number] };

async function errorsFor(dir: string): Promise<string> {
  const r = await validateContent(dir);
  return r.errors.map((e) => `${e.file}: ${e.message} ${e.fix ?? ''}`).join('\n');
}

describe('validateContent — valid content', () => {
  it('accepts a valid issue and article with an image', async () => {
    const md = article({}, 'Text.\n\n![A cell](images/cell.jpg "Cell | Photo: me")\n');
    const r = await validateContent(await oneArticle(md, { [`${A}/images/cell.jpg`]: img }));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('accepts a missing content folder (empty site)', async () => {
    const r = await validateContent('/nonexistent/arwsc');
    expect(r.errors).toEqual([]);
  });
  it('accepts a CRLF file with a byte-order mark', async () => {
    const md = '﻿' + article().replace(/\n/g, '\r\n');
    const r = await validateContent(await oneArticle(md));
    expect(r.errors).toEqual([]);
  });
  it('ignores system files and warns once about an extra .md file', async () => {
    const dir = await oneArticle(article(), {
      [`${A}/Thumbs.db`]: 'x',
      [`${A}/desktop.ini`]: 'x',
      [`${A}/.DS_Store`]: 'x',
      [`${A}/notes.md`]: 'scratch',
    });
    const r = await validateContent(dir);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].message).toContain('notes.md');
  });
  it('accepts authors as a list and quoted titles with colons', async () => {
    const md = article({ title: '"Cells: a story"', authors: '\n  - Ana\n  - Bo' });
    expect(await errorsFor(await oneArticle(md))).toBe('');
  });
});

describe('validateContent — errors in plain language', () => {
  const cases: [string, () => Promise<string>, string][] = [
    ['unknown segment', () => oneArticle(article({ segment: 'sports' })), 'announcements, feature, opinion, frontier'],
    ['HEIC image', () => oneArticle(article({}, '![a](images/photo.heic)'), { [`${A}/images/photo.heic`]: 'x' }), 'HEIC'],
    ['wrong-case path', () => oneArticle(article({}, '![a](images/Photo.jpg)'), { [`${A}/images/photo.jpg`]: img }), 'capital letters'],
    ['unquoted colon title', () => oneArticle(article({ title: 'Cells: a story' })), 'put the title in quotes'],
    ['external image', () => oneArticle(article({}, '![a](https://example.com/a.jpg)')), "must be a file inside the article's images folder"],
    ['data:image', () => oneArticle(article({}, '![a](data:image/png;base64,AAAA)')), 'data:image'],
    ['missing alt', () => oneArticle(article({}, '![](images/a.jpg)'), { [`${A}/images/a.jpg`]: img }), 'alt text'],
    ['missing summary', () => oneArticle(article({ summary: undefined })), 'summary'],
    ['issue mismatch', () => oneArticle(article({ issue: '2026-09' })), '2026-10'],
    ['bad folder', () => makeContent({ '2026-13/issue.md': ISSUE_MD }), 'YYYY-MM'],
    ['spaces in name', () => oneArticle(article({}, '![a](<images/My Photo.jpg>)'), { [`${A}/images/My Photo.jpg`]: img }), 'spaces'],
    ['straight quote in caption', () => oneArticle(article({}, '![a](images/a.jpg "He said "hi" there")'), { [`${A}/images/a.jpg`]: img }), 'typographic'],
    ['low-contrast ink', () => makeContent({ '2026-10/issue.md': '---\nissueNumber: 1\ntitle: T\ntheme:\n  ink: "#cccccc"\n---\n' }), '4.5:1'],
    ['missing image file', () => oneArticle(article({}, '![a](images/nope.jpg)')), "can't find"],
    ['hero without alt', () => oneArticle(article({ heroImage: 'images/a.jpg' }), { [`${A}/images/a.jpg`]: img }), 'heroAlt'],
    ['missing issue.md', () => makeContent({ [`${A}/my-article.md`]: article() }), 'issue.md'],
    ['md name differs from folder', () => makeContent({ '2026-10/issue.md': ISSUE_MD, [`${A}/article.md`]: article() }), 'my-article.md'],
    ['no frontmatter', () => oneArticle('Just text, no header.'), '---'],
    ['bad date', () => oneArticle(article({ date: 'someday' })), 'date'],
    ['image outside article folder', () => oneArticle(article({}, '![a](../other/images/a.jpg)')), "must be a file inside the article's images folder"],
  ];
  it.each(cases)('%s', async (_name, make, expected) => {
    expect(await errorsFor(await make())).toContain(expected);
  });
});

describe('validateContent — article order', () => {
  const two = (a: Record<string, string | undefined>, b: Record<string, string | undefined>) =>
    makeContent({
      '2026-10/issue.md': ISSUE_MD,
      '2026-10/one/one.md': article({ title: 'One', segment: 'opinion', ...a }),
      '2026-10/two/two.md': article({ title: 'Two', segment: 'opinion', ...b }),
    });
  const msgs = async (dir: string) => (await validateContent(dir)).warnings.map((w) => w.message).join('\n');

  it('does not require a date', async () => {
    const r = await validateContent(await oneArticle(article({ date: undefined })));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('is quiet when every article in a section has its own order number', async () => {
    expect(await msgs(await two({ order: '1' }, { order: '2' }))).toBe('');
  });
  it('warns when two articles in a section share an order number', async () => {
    const m = await msgs(await two({ order: '2' }, { order: '2' }));
    expect(m).toMatch(/both|share/);
    expect(m).toContain('order: 2');
  });
  it('warns when an article in a section of several has no order number', async () => {
    const m = await msgs(await two({ order: '1' }, {}));
    expect(m).toContain('two');
    expect(m).toMatch(/no order/);
  });
  it('does not ask for an order number when a section has only one article', async () => {
    expect(await msgs(await oneArticle(article()))).toBe('');
  });
});

describe('validateContent — warnings', () => {
  it('warns on oversized images', async () => {
    const dir = await oneArticle(article({}, '![a](images/big.jpg)'), { [`${A}/images/big.jpg`]: { image: [4200, 1000] } });
    const r = await validateContent(dir);
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.message).join()).toContain('4200');
  });
  it('warns when several articles are featured', async () => {
    const dir = await makeContent({
      '2026-10/issue.md': ISSUE_MD,
      '2026-10/a/a.md': article({ featured: 'true' }),
      '2026-10/b/b.md': article({ featured: 'true' }),
    });
    const r = await validateContent(dir);
    expect(r.warnings.map((w) => w.message).join()).toMatch(/featured/);
  });
  it('warns when an issue has no articles', async () => {
    const r = await validateContent(await makeContent({ '2026-10/issue.md': ISSUE_MD }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.message).join()).toMatch(/no articles/);
  });
  it('does not claim "no articles" when an article has a broken header', async () => {
    const r = await validateContent(await oneArticle(article({ title: 'Cells: a story' })));
    expect(r.warnings.map((w) => w.message).join()).not.toMatch(/no articles/);
  });
  it('warns and suggests a colour for a light accent', async () => {
    const dir = await makeContent({ '2026-10/issue.md': '---\nissueNumber: 1\ntitle: T\ntheme:\n  accent: "#ffd400"\n---\n' });
    const r = await validateContent(dir);
    expect(r.errors).toEqual([]);
    expect(r.warnings[0].message).toMatch(/#[0-9a-f]{6}/);
  });
});

describe('validateContent — review fixes', () => {
  it('rejects an unquoted # that YAML would silently cut off', async () => {
    const out = await errorsFor(await oneArticle(article({ title: 'We are #1 in science' })));
    expect(out).toContain('put the title in quotes');
  });
  it('accepts a quoted # in a title', async () => {
    expect(await errorsFor(await oneArticle(article({ title: '"We are #1 in science"' })))).toBe('');
  });
  it('rejects a non-ISO date such as 05/10/2026', async () => {
    const out = await errorsFor(await oneArticle(article({ date: '05/10/2026' })));
    expect(out).toContain('year-month-day');
  });
  it('rejects a non-ISO publishDate in issue.md', async () => {
    const dir = await makeContent({ '2026-10/issue.md': '---\nissueNumber: 1\ntitle: T\npublishDate: October 1 2026\n---\n' });
    expect(await errorsFor(dir)).toContain('year-month-day');
  });
  it('checks images in the editor\'s note', async () => {
    const dir = await makeContent({
      '2026-10/issue.md': '---\nissueNumber: 1\ntitle: T\n---\nA note.\n\n![](images/Missing.JPG)\n',
      '2026-10/a/a.md': article(),
    });
    const out = await errorsFor(dir);
    expect(out).toContain('alt text');
    expect(out).toContain('issue.md');
  });
});

describe('validateContent — comments in the header', () => {
  it('allows YAML comment lines between fields (as in the author template)', async () => {
    const md = '---\n# a comment line\ntitle: A Title\nsegment: feature\n# Year-month-day\ndate: 2026-10-05\nauthors: Ana\nsummary: S.\n---\nBody.\n';
    expect(await errorsFor(await oneArticle(md))).toBe('');
  });
  it('accepts the shipped author template', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const files: Record<string, string | Buffer> = { '2026-11/issue.md': ISSUE_MD };
    files['2026-11/example-article/example-article.md'] = readFileSync('_template/example-article/example-article.md', 'utf8');
    for (const f of readdirSync('_template/example-article/images')) {
      files[`2026-11/example-article/images/${f}`] = readFileSync(`_template/example-article/images/${f}`);
    }
    expect(await errorsFor(await makeContent(files))).toBe('');
  });
});

describe('validateContent — issue template', () => {
  it('accepts the shipped issue template with its editor\'s note', async () => {
    const { readFileSync } = await import('node:fs');
    const dir = await makeContent({
      '2026-11/issue.md': readFileSync('_template/new-issue/issue.md', 'utf8'),
      '2026-11/a/a.md': article(),
    });
    expect(await errorsFor(dir)).toBe('');
  });
});
