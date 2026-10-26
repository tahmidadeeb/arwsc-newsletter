import { beforeAll, describe, expect, it } from 'vitest';
import { article, ISSUE_MD, makeContent } from '../helpers/content';
import { buildSite, type Built } from './helpers';

let site: Built;

beforeAll(async () => {
  const dir = await makeContent({
    '2026-10/issue.md': ISSUE_MD,
    '2026-10/bare/bare.md': article({ title: 'Header Only Article', order: '1' }, ''),
    '2026-10/full/full.md': article(
      { title: 'Full Article', order: '2', authors: '\n  - Ana Rahman\n  - Bo Chen\n  - Chidi Okafor' },
      'First paragraph.[^1]\n\n## A section\n\n> A quote.\n\n[^1]: A reference.\n',
    ),
  });
  site = buildSite(dir);
});

describe('article page', () => {
  it('renders a frontmatter-only article without empty paragraphs or references', () => {
    const html = site.html('issues/2026-10/bare');
    expect(html).toContain('Header Only Article');
    expect(html).not.toContain('class="footnotes references"');
    expect(html).not.toMatch(/<p>\s*<\/p>/);
    expect(html).not.toContain('class="prose');
  });
  it('renders byline, references and next-article link', () => {
    const html = site.html('issues/2026-10/full');
    expect(html).toContain('Ana Rahman, Bo Chen and Chidi Okafor');
    expect(html).toContain('class="footnotes references"');
    expect(html).toContain('class="prose');
  });
  it('links the first article to the next and the last back to the issue', () => {
    expect(site.html('issues/2026-10/bare')).toMatch(/href="\/issues\/2026-10\/full\/"[^>]*>[\s\S]*?Next in this issue|Next in this issue[\s\S]*?href="\/issues\/2026-10\/full\/"/);
    expect(site.html('issues/2026-10/full')).toContain('Back to the issue');
  });
});
