import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadSite } from '../../src/lib/data';
import { article, ISSUE_MD, makeContent } from '../helpers/content';
import { buildSite, type Built } from './helpers';

let site: Built;
let css = '';

beforeAll(async () => {
  const dir = await makeContent({
    '2026-10/issue.md': ISSUE_MD,
    '2026-10/lead/lead.md': article({ title: 'The Lead', featured: 'true', order: '1' }),
    '2026-10/f2/f2.md': article({ title: 'Second Feature', order: '2', date: '2026-10-09' }),
    '2026-10/op/op.md': article({ title: 'An Opinion', segment: 'opinion', order: '1' }),
    '2026-10/n1/n1.md': article({ title: 'Dated Notice', segment: 'announcements', order: '1', date: '2026-10-17' }),
    '2026-10/n2/n2.md': article({ title: 'Undated Notice', segment: 'announcements', order: '2', date: undefined }),
    '2026-10/fr/fr.md': article({ title: 'A Dispatch', segment: 'frontier', authors: undefined }),
    '2026-09/issue.md': '---\nissueNumber: 2\ntitle: Notices Only\n---\n',
    '2026-09/n9/n9.md': article({ title: 'Only Notice', segment: 'announcements', issue: undefined }),
    '2026-08/issue.md': '---\nissueNumber: 3\ntitle: Empty\n---\n',
  });
  site = buildSite(dir);
  const d = join(site.out, '_astro');
  // Astro inlines small stylesheets into the page, so read both.
  css =
    readdirSync(d).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(d, f), 'utf8')).join('') +
    parse(site.html('')).querySelectorAll('style').map((s) => s.text).join('');
});

const card = (p: string, title: string) =>
  parse(site.html(p)).querySelectorAll('.nt').find((c) => c.text.includes(title))!;

describe('top bar and title line', () => {
  it('shows no issue line in the home page top bar', () => {
    expect(parse(site.html('')).querySelector('.mast__line')!.text.trim()).toBe('');
  });
  it('keeps the issue line in the top bar of issue pages', () => {
    expect(parse(site.html('issues/2026-10')).querySelector('.mast__line')!.text).toContain('Issue No. 1');
  });
  it('says "Published by the" before the club name under the title', () => {
    expect(parse(site.html('')).querySelector('.mast__sub')!.text.trim()).toBe(`Published by the ${loadSite().clubName}`);
  });
  it('sets the issue line on the cover larger', () => {
    expect(css).toMatch(/\.cover__kicker[^{]*\{[^}]*font-size:\.9375rem/);
  });
});

describe('page labels', () => {
  for (const p of ['contact', 'team', 'about']) {
    it(`has no small label above the heading on ${p}`, () => {
      expect(parse(site.html(p)).querySelectorAll('.ph-head__k')).toHaveLength(0);
    });
  }
  it('keeps the other headings on the contact page', () => {
    const text = parse(site.html('contact')).text;
    expect(text).toContain('Write to the editors');
    expect(text).toContain('Elsewhere');
  });
});

describe('dates on Club Announcements only', () => {
  it('shows the date block on a dated announcement', () => {
    const c = card('issues/2026-10', 'Dated Notice');
    expect(c.querySelector('time.nt__date')!.getAttribute('datetime')).toBe('2026-10-17');
    expect(c.querySelector('.nt__day')!.text.trim()).toBe('17');
    expect(c.querySelector('.nt__mon')!.text.trim()).toBe('Oct');
  });
  it('shows an undated announcement without a date block', () => {
    const c = card('issues/2026-10', 'Undated Notice');
    expect(c.querySelector('.nt__date')).toBeNull();
    expect(c.text).not.toContain('NaN');
  });
  it('shows no date on other sections even when the file has one', () => {
    const issue = parse(site.html('issues/2026-10'));
    const times = issue.querySelectorAll('main time').filter((t) => !t.closest('.nt'));
    expect(times).toHaveLength(0);
    expect(parse(site.html('issues/2026-10/f2')).querySelectorAll('main time')).toHaveLength(0);
  });
});

describe('article counts', () => {
  const tile = (folder: string) =>
    parse(site.html('issues')).querySelectorAll('.tile').find((t) => t.querySelector(`a[href="/issues/${folder}/"]`))!;
  it('counts only Feature and Opinion pieces on the archive tile', () => {
    expect(tile('2026-10').querySelector('.tile__meta')!.text.trim()).toBe('3 articles');
  });
  it('counts only Feature and Opinion pieces beside "In this issue"', () => {
    expect(parse(site.html('issues/2026-10')).querySelector('.toc__total')!.text.trim()).toBe('3 articles');
  });
  it('uses the same count in the search/share description of the issue page', () => {
    const meta = parse(site.html('issues/2026-10')).querySelector('meta[name="description"]')!.getAttribute('content');
    expect(meta).toContain('3 articles');
  });
  it('shows no count for an issue with only announcements', () => {
    expect(tile('2026-09').querySelector('.tile__meta')).toBeNull();
  });
  it('says "In preparation" for an issue with nothing in it', () => {
    expect(tile('2026-08').querySelector('.tile__meta')!.text.trim()).toBe('In preparation');
  });
});

describe('lead story tab and contents on phones', () => {
  it('puts the Lead story tab and the section tag on one row', () => {
    const head = parse(site.html('')).querySelector('.cover__leadhead')!;
    const kids = head.childNodes.filter((n) => 'classList' in n) as unknown as { classList: { contains(c: string): boolean }; text: string }[];
    expect(kids[0].classList.contains('cover__tab')).toBe(true);
    expect(kids[0].text.trim()).toBe('Lead story');
    expect(kids[1].classList.contains('tag')).toBe(true);
  });
  it('fills the tab with the accent colour', () => {
    expect(css).toMatch(/\.cover__tab[^{]*\{[^}]*background:var\(--accent\)/);
  });
  it('hides the contents list below 640px', () => {
    // The minifier may write the query as (max-width:39.99rem) or (width<=39.99rem).
    expect(css).toMatch(/@media \((?:max-width:\s?|width<=)39\.99rem\)\{\.toc[^{_]*\{display:none/);
  });
});

describe('About page text', () => {
  it('sets the newsletter name and arw,sc in italics in the intro', () => {
    const ems = parse(site.html('about')).querySelectorAll('.ph-head__lede em').map((e) => e.text);
    expect(ems).toEqual(['the arw,sc newsletter', 'arw,sc']);
  });
  it('uses the new section descriptions, in order', () => {
    const text = parse(site.html('about')).querySelectorAll('.about__segs li p').map((p) => p.text.trim());
    expect(text).toEqual([
      'The latest news from the club',
      'Student-written reporting on scientific topics and medical research',
      'Essays offering the student perspective',
      'A bulletin of recent breakthroughs in medical science',
    ]);
  });
});

describe('white background', () => {
  it('uses white as the page colour', () => {
    expect(site.html('')).toMatch(/--paper:#ffffff/);
  });
  it('drops the paper-grain texture', () => {
    expect(css).not.toContain('feTurbulence');
  });
});

describe('announcement cards on white', () => {
  it('gives announcement cards a light grey fill so they stand out from the white page', () => {
    expect(css).toMatch(/\.nt\[[^\]]*\]\{[^}]*background:var\(--paper-deep\)/);
  });
});
