import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { beforeAll, describe, expect, it } from 'vitest';
import { article, ISSUE_MD, makeContent } from '../helpers/content';
import { buildSite, type Built } from './helpers';

let site: Built;

beforeAll(async () => {
  const dir = await makeContent({
    '2026-10/issue.md': ISSUE_MD,
    '2026-10/a/a.md': article({ title: 'An Article', order: '1' }, 'This is the first paragraph.\n\nSecond.\n'),
    '2026-10/b/b.md': article({ title: 'Another Article', order: '2', date: undefined }),
    '2026-10/n1/n1.md': article({ title: 'A Notice', segment: 'announcements', order: '1' }),
    '2026-10/f1/f1.md': article({ title: 'A Dispatch', segment: 'frontier', order: '1' }),
    '2026-10/f2/f2.md': article({ title: 'Another Dispatch', segment: 'frontier', order: '2' }),
    '2026-10/o1/o1.md': article({ title: 'An Opinion', segment: 'opinion', order: '1' }),
  });
  site = buildSite(dir);
});

describe('branding', () => {
  it('shows the full club name under the masthead and no motto line', () => {
    const doc = parse(site.html(''));
    const sub = doc.querySelector('.mast__sub')!;
    expect(sub.text).toContain('Academic and Research Wing, Science Club – Rajshahi Medical College');
    expect(site.html('')).not.toContain('Research · Opinion · The Frontier');
  });
  it('uses the full logo (wordmark and mark) in the footer', () => {
    const footer = parse(site.html('')).querySelector('footer')!;
    const img = footer.querySelector('img.foot__logo')!;
    expect(img.getAttribute('alt')).toBe('arw,sc');
  });
  it('does not show build details or an RSS link to readers', () => {
    const footer = parse(site.html('')).querySelector('footer')!;
    expect(footer.text).not.toContain('Published from Markdown');
    expect(footer.querySelector('a[href="/rss.xml"]')).toBeNull();
    // The feed itself still exists for feed readers.
    expect(site.exists('rss.xml')).toBe(true);
  });
  it('does not set the opening line of an article in small caps', () => {
    const dir = join(site.out, '_astro');
    const css = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('');
    expect(css).toContain('first-letter');
    expect(css).not.toMatch(/first-line\{[^}]*small-caps/);
  });
});

describe('masthead title', () => {
  it('sets the whole title in italic, centred', () => {
    const dir = join(site.out, '_astro');
    const css = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('');
    expect(parse(site.html('')).querySelector('.mast__title')!.text.trim()).toBe('the arw,sc newsletter');
    expect(css).toMatch(/\.mast__title[^{]*\{[^}]*font-style:italic/);
    expect(css).toMatch(/\.mast__link[^{]*\{[^}]*justify-content:center/);
  });
});

describe('section headings', () => {
  it('shows only the number in the box beside a section heading (no repeated name)', () => {
    const doc = parse(site.html('issues/2026-10'));
    const head = doc.querySelector('.seg__head')!;
    expect(head.querySelector('.tag__i')!.text).toBe('01');
    expect(head.querySelector('.tag__l')).toBeNull();
    expect(head.querySelector('.seg__h')!.text).toBe('Club Announcements');
  });
  it('sets section names in bold in the contents list and section headings', () => {
    const dir = join(site.out, '_astro');
    const css = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('');
    expect(css).toMatch(/\.toc__seg[^{]*\{[^}]*font-weight:700/);
    expect(css).toMatch(/\.seg__h[^{]*\{[^}]*font-weight:700/);
  });
});

describe('no dates or article numbers on the page', () => {
  const pages = () => ['', 'issues/2026-10', 'issues/2026-10/a', 'issues/2026-10/b', 'issues/2026-10/n1', 'issues/2026-10/f1', 'issues/2026-10/o1', 'issues'];
  it('shows no article dates anywhere', () => {
    for (const p of pages()) {
      const doc = parse(site.html(p));
      const main = doc.querySelector('main')!;
      expect(main.querySelectorAll('time'), p).toHaveLength(0);
      expect(main.text, p).not.toMatch(/\b5 October 2026\b|\bOct\b/);
    }
  });
  it('shows no article numbers in the contents list or Frontier dispatches', () => {
    const doc = parse(site.html('issues/2026-10'));
    expect(doc.querySelectorAll('.toc__n')).toHaveLength(0);
    expect(doc.querySelectorAll('.dp__n')).toHaveLength(0);
    expect(doc.querySelectorAll('.nt__date')).toHaveLength(0);
  });
  it('lists articles in the order given by their order numbers', () => {
    const titles = parse(site.html('issues/2026-10')).querySelectorAll('.seg--frontier .dp__t').map((a) => a.text.trim());
    expect(titles).toEqual(['A Dispatch', 'Another Dispatch']);
  });
});

describe('issue label', () => {
  it('writes the issue number in full as "Issue No."', () => {
    for (const p of ['', 'issues/2026-10', 'issues/2026-10/b', 'issues']) {
      const text = parse(site.html(p)).querySelector('body')!.text;
      expect(text, p).toContain('Issue No. 1');
      expect(text.replace(/Issue No\. /g, ''), p).not.toMatch(/No\. \d/);
    }
  });
});

describe('"In this issue" list', () => {
  for (const p of ['', 'issues/2026-10']) {
    it(`leaves out The Frontier but keeps it as its own section (${p || 'home'})`, () => {
      const doc = parse(site.html(p));
      const toc = doc.querySelector('.toc')!;
      expect(toc.querySelectorAll('.toc__seg').map((h) => h.text.trim())).toEqual(['Club Announcements', 'Feature Articles', 'Opinion']);
      expect(toc.text).not.toContain('Dispatch');
      expect(toc.querySelector('.toc__total')!.text).toContain('4 articles');
      expect(doc.querySelectorAll('.seg--frontier .dp__t').map((a) => a.text.trim())).toEqual(['A Dispatch', 'Another Dispatch']);
    });
  }
});
