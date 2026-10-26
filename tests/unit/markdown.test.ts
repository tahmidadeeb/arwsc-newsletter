import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { markdownOptions } from '../../src/markdown';

async function render(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(markdownOptions.remarkPlugins)
    .use(remarkRehype, markdownOptions.remarkRehype)
    .use(markdownOptions.rehypePlugins)
    .use(rehypeStringify)
    .process(md);
  return String(file);
}

describe('figures', () => {
  it('turns a standalone image into a numbered figure with caption and credit', async () => {
    const html = await render('![A cell](images/a.jpg "Dividing cell | Photo: R. Khan")');
    expect(html).toContain('<figure class="fig"');
    expect(html).toContain('Fig. 1');
    expect(html).toContain('<figcaption');
    expect(html).toContain('Dividing cell');
    expect(html).toContain('<span class="fig__credit">Photo: R. Khan</span>');
    expect(html).not.toContain('title=');
  });
  it('numbers figures in order and marks wide ones', async () => {
    const html = await render('![a](images/a.jpg "One")\n\n![b](images/b.jpg "[wide] Two")');
    expect(html).toContain('Fig. 2');
    expect(html).toContain('class="fig fig--wide"');
  });
  it('leaves an inline image inside a sentence alone', async () => {
    const html = await render('Text ![a](images/a.jpg) more text.');
    expect(html).not.toContain('<figure');
  });
  it('makes a figure without a caption when there is no title', async () => {
    const html = await render('![alt only](images/a.jpg)');
    expect(html).toContain('<figure class="fig"');
    expect(html).not.toContain('<figcaption');
  });
});

describe('tables', () => {
  it('wraps tables in a scrollable, focusable region', async () => {
    const html = await render('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toMatch(/<div class="table-scroll" role="region" aria-label="Table" tabindex="0"><table>/);
  });
});

describe('footnotes', () => {
  it('renders a visible References section with labelled back-links', async () => {
    const html = await render('Claim.[^1]\n\n[^1]: Source.');
    expect(html).toContain('class="footnotes references"');
    expect(html).toContain('>References</h2>');
    expect(html).not.toMatch(/<h2[^>]*class="sr-only"/);
    expect(html).toContain('aria-label="Back to reference 1"');
    expect(html).toContain('↩');
  });
});
