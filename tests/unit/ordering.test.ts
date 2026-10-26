import { describe, expect, it } from 'vitest';
import {
  groupBySegment,
  nextArticle,
  pickLead,
  readingOrder,
  sortArticles,
  sortIssues,
} from '../../src/lib/ordering';
import type { ArticleLike, Segment } from '../../src/lib/types';

const segs: Segment[] = [
  { key: 'feature', label: 'Feature Articles', order: 1, treatment: 'standard' },
  { key: 'opinion', label: 'Opinion', order: 2, treatment: 'opinion' },
  { key: 'frontier', label: 'The Frontier', order: 3, treatment: 'frontier' },
];

let n = 0;
function art(p: Partial<ArticleLike>): ArticleLike {
  n++;
  return {
    slug: p.slug ?? `a${n}`,
    issue: '2026-10',
    title: p.title ?? `Title ${n}`,
    date: p.date ?? new Date('2026-10-01'),
    segment: p.segment ?? 'feature',
    order: p.order,
    featured: p.featured,
  };
}

describe('sortArticles', () => {
  it('sorts by order with missing orders last', () => {
    const out = sortArticles([art({ order: 2 }), art({}), art({ order: 1 })]);
    expect(out.map((a) => a.order)).toEqual([1, 2, undefined]);
  });
  it('ignores dates: the order number alone decides, whatever the dates say', () => {
    const second = art({ order: 2, date: new Date('2026-10-01') });
    const first = art({ order: 1, date: new Date('2026-10-30') });
    expect(sortArticles([second, first])[0]).toBe(first);
  });
  it('breaks equal order by title, not by date', () => {
    const zed = art({ order: 1, title: 'Zed', date: new Date('2026-10-01') });
    const able = art({ order: 1, title: 'Able', date: new Date('2026-10-30') });
    expect(sortArticles([zed, able])[0]).toBe(able);
  });
  it('breaks equal order and date by title', () => {
    const b = art({ order: 1, title: 'Beta' });
    const a = art({ order: 1, title: 'alpha' });
    expect(sortArticles([b, a])[0]).toBe(a);
  });
  it('breaks full ties by slug so output is deterministic', () => {
    const y = art({ slug: 'b-x', title: 'Same' });
    const x = art({ slug: 'a-x', title: 'Same' });
    expect(sortArticles([y, x]).map((a) => a.slug)).toEqual(['a-x', 'b-x']);
    expect(sortArticles([x, y]).map((a) => a.slug)).toEqual(['a-x', 'b-x']);
  });
  it('does not mutate its input', () => {
    const input = [art({ order: 2 }), art({ order: 1 })];
    const copy = [...input];
    sortArticles(input);
    expect(input).toEqual(copy);
  });
});

describe('pickLead', () => {
  it('uses the lowest order when nothing is featured', () => {
    const a = art({ order: 3 });
    const b = art({ order: 1, segment: 'opinion' });
    expect(pickLead([a, b], segs)).toEqual({ lead: b, warnings: [] });
  });
  it('prefers featured, lowest order, and warns when several are featured', () => {
    const a = art({ order: 5, featured: true });
    const b = art({ order: 3, featured: true });
    const c = art({ order: 1 });
    const r = pickLead([a, b, c], segs);
    expect(r.lead).toBe(b);
    expect(r.warnings).toHaveLength(1);
  });
  it('falls back to the first article of the first segment when no orders exist', () => {
    const op = art({ segment: 'opinion', title: 'A' });
    const fe = art({ segment: 'feature', title: 'Z' });
    expect(pickLead([op, fe], segs).lead).toBe(fe);
  });
  it('does not pick a club announcement as the lead when other articles exist, even if announcements come first', () => {
    const withNotice: Segment[] = [
      { key: 'announcements', label: 'Club Announcements', order: 1, treatment: 'notice' },
      ...segs.map((s) => ({ ...s, order: s.order + 1 })),
    ];
    const notice = art({ segment: 'announcements', order: 1 });
    const fe = art({ segment: 'feature', order: 1 });
    expect(pickLead([notice, fe], withNotice).lead).toBe(fe);
    // An issue with only announcements still gets a lead.
    expect(pickLead([notice], withNotice).lead).toBe(notice);
  });
  it('returns null for no articles', () => {
    expect(pickLead([], segs)).toEqual({ lead: null, warnings: [] });
  });
});

describe('groupBySegment', () => {
  it('omits segments with no articles and keeps segment order', () => {
    const g = groupBySegment([art({ segment: 'frontier' })], segs);
    expect(g).toHaveLength(1);
    expect(g[0].segment.key).toBe('frontier');
  });
  it('orders groups by segment order', () => {
    const g = groupBySegment([art({ segment: 'frontier' }), art({ segment: 'feature' })], segs);
    expect(g.map((x) => x.segment.key)).toEqual(['feature', 'frontier']);
  });
});

describe('readingOrder / nextArticle', () => {
  const f1 = art({ slug: 'f1', segment: 'feature', order: 1 });
  const f2 = art({ slug: 'f2', segment: 'feature', order: 2 });
  const o1 = art({ slug: 'o1', segment: 'opinion', order: 1 });
  const all = [o1, f2, f1];
  it('follows segment order then article order', () => {
    expect(readingOrder(all, segs).map((a) => a.slug)).toEqual(['f1', 'f2', 'o1']);
  });
  it('gives the next article and null at the end', () => {
    expect(nextArticle(all, segs, 'f2')?.slug).toBe('o1');
    expect(nextArticle(all, segs, 'o1')).toBeNull();
  });
});

describe('sortIssues', () => {
  it('sorts newest first, breaking ties by folder descending', () => {
    const d = new Date('2026-10-01');
    const out = sortIssues([
      { folder: '2026-09', publishDate: d },
      { folder: '2026-10', publishDate: d },
      { folder: '2026-11', publishDate: new Date('2026-11-01') },
    ]);
    expect(out.map((i) => i.folder)).toEqual(['2026-11', '2026-10', '2026-09']);
  });
});
