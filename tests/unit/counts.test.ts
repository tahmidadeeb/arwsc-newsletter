import { describe, expect, it } from 'vitest';
import { countArticles, countsAsArticle } from '../../src/lib/ordering';
import { loadSegments } from '../../src/lib/data';

const segs = loadSegments();

describe('what counts as an article', () => {
  it('counts Feature and Opinion pieces only', () => {
    const list = [{ segment: 'feature' }, { segment: 'opinion' }, { segment: 'announcements' }, { segment: 'frontier' }];
    expect(countArticles(list, segs)).toBe(2);
  });
  it('treats Club Announcements and Frontier entries as non-articles', () => {
    expect(countsAsArticle({ segment: 'announcements' }, segs)).toBe(false);
    expect(countsAsArticle({ segment: 'frontier' }, segs)).toBe(false);
    expect(countsAsArticle({ segment: 'feature' }, segs)).toBe(true);
    expect(countsAsArticle({ segment: 'opinion' }, segs)).toBe(true);
  });
});
