import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse } from 'node-html-parser';
import { beforeAll, describe, expect, it } from 'vitest';
import { article, ISSUE_MD, makeContent } from '../helpers/content';
import { buildSite, type Built } from './helpers';

const TITLE = 'Cells & "Signals" <in> Motion — 🧬 Ünïcode';
const SITE = 'https://news.example.edu';
let site: Built;

beforeAll(async () => {
  const dir = await makeContent({
    '2026-10/issue.md': ISSUE_MD,
    '2026-10/odd/odd.md': article({
      title: `'${TITLE}'`,
      authors: 'José Álvarez',
      summary: '"Summary with <tags> & ampersands."',
    }),
  });
  site = buildSite(dir, { SITE_URL: SITE });
});

describe('SEO and sharing', () => {
  it('escapes the title and keeps its exact text in meta tags', () => {
    const raw = site.html('issues/2026-10/odd');
    expect(raw).toContain('Cells &amp;');
    const doc = parse(raw);
    expect(doc.querySelector('title')!.text).toBe(`${TITLE} · the arw,sc newsletter`);
    expect(doc.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe(TITLE);
    expect(doc.querySelector('meta[name="description"]')!.getAttribute('content')).toBe('Summary with <tags> & ampersands.');
  });
  it('uses SITE_URL for canonical and og:url', () => {
    const doc = parse(site.html('issues/2026-10/odd'));
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(`${SITE}/issues/2026-10/odd/`);
    expect(doc.querySelector('meta[property="og:url"]')!.getAttribute('content')).toBe(`${SITE}/issues/2026-10/odd/`);
  });
  it('generates a share image for an article without a hero image', () => {
    const doc = parse(site.html('issues/2026-10/odd'));
    const og = doc.querySelector('meta[property="og:image"]')!.getAttribute('content')!;
    expect(og.startsWith(SITE)).toBe(true);
    const file = join(site.out, new URL(og).pathname);
    expect(statSync(file).size).toBeGreaterThan(5000);
    const sig = execFileSync('head', ['-c', '8', file]).toString('latin1');
    expect(sig).toContain('PNG');
  });
  it('produces a valid RSS feed containing the article', () => {
    const xml = site.file('rss.xml');
    expect(XMLValidator.validate(xml)).toBe(true);
    const feed = new XMLParser().parse(xml);
    const items = [].concat(feed.rss.channel.item);
    expect(items).toHaveLength(1);
    expect((items[0] as { title: string }).title).toBe(TITLE);
    expect((items[0] as { link: string }).link).toBe(`${SITE}/issues/2026-10/odd/`);
  });
  it('writes a sitemap and a robots.txt that points to it', () => {
    expect(site.exists('sitemap-index.xml')).toBe(true);
    expect(site.file('sitemap-0.xml')).toContain(`${SITE}/issues/2026-10/odd/`);
    expect(site.file('sitemap-0.xml')).not.toContain('/og/');
    expect(site.file('robots.txt')).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
  });
});
