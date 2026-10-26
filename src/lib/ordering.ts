import type { ArticleLike, IssueLike, Segment } from './types';

const titleCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function compareArticles(a: ArticleLike, b: ArticleLike): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao < bo ? -1 : 1;
  const t = titleCollator.compare(a.title, b.title);
  if (t !== 0) return t;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/** Order within a segment: order (missing last), then title, then slug. Dates play no part. */
export function sortArticles<T extends ArticleLike>(articles: readonly T[]): T[] {
  return [...articles].sort(compareArticles);
}

/** Groups articles by segment in segment display order; empty segments are omitted. */
export function groupBySegment<T extends ArticleLike>(
  articles: readonly T[],
  segments: readonly Segment[],
): { segment: Segment; articles: T[] }[] {
  return [...segments]
    .sort((a, b) => a.order - b.order)
    .map((segment) => ({
      segment,
      articles: sortArticles(articles.filter((a) => a.segment === segment.key)),
    }))
    .filter((g) => g.articles.length > 0);
}

/** All articles in the order a reader meets them: segment by segment. */
export function readingOrder<T extends ArticleLike>(
  articles: readonly T[],
  segments: readonly Segment[],
): T[] {
  return groupBySegment(articles, segments).flatMap((g) => g.articles);
}

/**
 * The lead story: featured articles first (lowest order wins, warning if
 * several are featured); otherwise the lowest order across the issue,
 * skipping club notices while any other article exists; otherwise the first
 * article in reading order.
 */
export function pickLead<T extends ArticleLike>(
  articles: readonly T[],
  segments: readonly Segment[],
): { lead: T | null; warnings: string[] } {
  if (articles.length === 0) return { lead: null, warnings: [] };
  const ordered = readingOrder(articles, segments);
  const byOrder = (list: T[]) =>
    [...list].sort((a, b) => {
      const d = (a.order ?? Infinity) - (b.order ?? Infinity);
      return d !== 0 && !Number.isNaN(d) ? d : ordered.indexOf(a) - ordered.indexOf(b);
    });
  const featured = ordered.filter((a) => a.featured);
  if (featured.length > 0) {
    const lead = byOrder(featured)[0];
    const warnings =
      featured.length > 1
        ? [
            `${featured.length} articles are marked "featured: true" in issue ${lead.issue} ` +
              `(${featured.map((a) => a.slug).join(', ')}). Using "${lead.slug}" as the lead story. ` +
              `Mark only one article as featured to choose the lead yourself.`,
          ]
        : [];
    return { lead, warnings };
  }
  const notices = new Set(segments.filter((s) => s.treatment === 'notice').map((s) => s.key));
  const candidates = ordered.filter((a) => !notices.has(a.segment));
  return { lead: byOrder(candidates.length > 0 ? candidates : ordered)[0], warnings: [] };
}

export function nextArticle<T extends ArticleLike>(
  articles: readonly T[],
  segments: readonly Segment[],
  slug: string,
): T | null {
  const ordered = readingOrder(articles, segments);
  const i = ordered.findIndex((a) => a.slug === slug);
  return i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : null;
}

/** Newest first; ties broken by folder name, newest first. */
export function sortIssues<T extends IssueLike>(issues: readonly T[]): T[] {
  return [...issues].sort((a, b) => {
    const d = b.publishDate.getTime() - a.publishDate.getTime();
    if (d !== 0) return d;
    return a.folder < b.folder ? 1 : a.folder > b.folder ? -1 : 0;
  });
}

/**
 * Segment blocks shown below the cover: the lead story is shown in the cover,
 * so it is removed from its segment, and segments left empty are dropped.
 */
export function blocksAfterLead<T extends ArticleLike>(
  groups: { segment: Segment; articles: T[] }[],
  leadSlug: string | undefined,
): { segment: Segment; articles: T[] }[] {
  return groups
    .map((g) => ({ segment: g.segment, articles: g.articles.filter((a) => a.slug !== leadSlug) }))
    .filter((g) => g.articles.length > 0);
}
