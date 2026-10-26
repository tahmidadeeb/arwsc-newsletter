import { parse } from 'node-html-parser';
import { beforeAll, describe, expect, it } from 'vitest';
import { article, ISSUE_MD, makeContent } from '../helpers/content';
import { buildSite, type Built } from './helpers';

let site: Built;

beforeAll(async () => {
  // The only feature is the lead story, so the Feature block has nothing left to show.
  const dir = await makeContent({
    '2026-10/issue.md': ISSUE_MD,
    '2026-10/lead/lead.md': article({ title: 'The Lead', segment: 'feature', featured: 'true' }),
    '2026-10/op/op.md': article({ title: 'An Opinion', segment: 'opinion' }),
    '2026-10/fr/fr.md': article({ title: 'A Dispatch', segment: 'frontier' }),
  });
  site = buildSite(dir);
});

function check(path: string) {
  const doc = parse(site.html(path));
  const ids = new Set(doc.querySelectorAll('[id]').map((e) => e.getAttribute('id')));
  return { doc, ids };
}

describe('section anchors when the lead empties its section', () => {
  it.each(['', 'issues/2026-10'])('every in-page contents link has a target (%s)', (path) => {
    const { doc, ids } = check(path);
    const hashes = doc.querySelectorAll('.toc a[href^="#"]').map((a) => a.getAttribute('href')!.slice(1));
    expect(hashes.length).toBeGreaterThan(0);
    for (const h of hashes) expect(ids.has(h)).toBe(true);
  });
  it('the article section tag points to an anchor that exists on the issue page', () => {
    const art = parse(site.html('issues/2026-10/lead'));
    const href = art.querySelector('.art__crumb a.tag')!.getAttribute('href')!;
    expect(href).toBe('/issues/2026-10/#feature');
    expect(check('issues/2026-10').ids.has('feature')).toBe(true);
  });
  it('numbers the remaining section blocks without gaps', () => {
    const { doc } = check('issues/2026-10');
    const nums = doc.querySelectorAll('.seg__head .tag__i').map((e) => e.text);
    expect(nums).toEqual(['01', '02']);
  });
});
