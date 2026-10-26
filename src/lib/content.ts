/**
 * The one place pages get content from. Everything here is derived from the
 * files present: nothing about counts or composition is assumed.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { loadSegments, loadThemes } from './data';
import { folderToDate, formatMonth } from './format';
import { groupBySegment, nextArticle, pickLead, readingOrder, sortIssues } from './ordering';
import { resolveTheme, type ThemeTokens } from './theme';
import type { Segment } from './types';

export interface Issue {
  folder: string;
  issueNumber: number;
  title: string;
  monthLabel: string;
  publishDate: Date;
  cover?: { src: ImageMetadata; alt: string };
  theme: ThemeTokens;
  hasNote: boolean;
  entry: CollectionEntry<'issues'>;
}

export interface Article {
  slug: string;
  issue: string;
  title: string;
  authors: string[];
  segment: string;
  date: Date;
  summary: string;
  dek?: string;
  hero?: { src: ImageMetadata; alt: string; caption?: string; credit?: string };
  featured: boolean;
  order?: number;
  entry: CollectionEntry<'articles'>;
}

export interface IssueBundle {
  issue: Issue;
  articles: Article[];
  groups: { segment: Segment; articles: Article[] }[];
  lead: Article | null;
}

const includeDrafts = !import.meta.env.PROD;
let segmentsCache: Segment[] | undefined;
export const segments = () => (segmentsCache ??= loadSegments());
let themesCache: ReturnType<typeof loadThemes> | undefined;
const themes = () => (themesCache ??= loadThemes());

export function brandTheme(): ThemeTokens {
  return resolveTheme(undefined, themes()).tokens;
}

function toIssue(entry: CollectionEntry<'issues'>): Issue {
  const d = entry.data;
  const publishDate = d.publishDate ?? folderToDate(entry.id);
  return {
    folder: entry.id,
    issueNumber: d.issueNumber,
    title: d.title,
    monthLabel: d.monthLabel ?? formatMonth(folderToDate(entry.id)),
    publishDate,
    cover: d.coverImage ? { src: d.coverImage, alt: d.coverAlt ?? '' } : undefined,
    theme: resolveTheme(d.theme, themes()).tokens,
    hasNote: Boolean(entry.body && entry.body.trim()),
    entry,
  };
}

function toArticle(entry: CollectionEntry<'articles'>): Article {
  const d = entry.data;
  const [issue, slug] = entry.id.split('/');
  return {
    slug,
    issue,
    title: d.title,
    // Frontier dispatches are unsigned: their authors are never shown.
    authors: segments().find((s) => s.key === d.segment)?.treatment === 'frontier' ? [] : d.authors,
    segment: d.segment,
    // Not shown to readers; used for the RSS feed and search engines.
    date: d.date ?? folderToDate(issue),
    summary: d.summary,
    dek: d.dek,
    hero: d.heroImage
      ? { src: d.heroImage, alt: d.heroAlt ?? '', caption: d.heroCaption, credit: d.heroCredit }
      : undefined,
    featured: d.featured,
    order: d.order,
    entry,
  };
}

let issuesCache: Issue[] | undefined;
export async function getIssues(): Promise<Issue[]> {
  if (issuesCache) return issuesCache;
  const entries = await getCollection('issues', ({ data }) => includeDrafts || !data.draft);
  issuesCache = sortIssues(entries.map(toIssue));
  return issuesCache;
}

let articlesCache: Article[] | undefined;
export async function getAllArticles(): Promise<Article[]> {
  if (articlesCache) return articlesCache;
  const live = new Set((await getIssues()).map((i) => i.folder));
  const keys = new Set(segments().map((s) => s.key));
  const entries = await getCollection('articles', ({ data }) => includeDrafts || !data.draft);
  articlesCache = entries
    .map(toArticle)
    // Articles whose issue has no issue.md, is a draft, or has an unknown
    // segment are left out (the validator reports these before the build).
    .filter((a) => live.has(a.issue) && keys.has(a.segment));
  return articlesCache;
}

export async function getIssue(folder: string): Promise<IssueBundle | null> {
  const issue = (await getIssues()).find((i) => i.folder === folder);
  if (!issue) return null;
  const articles = (await getAllArticles()).filter((a) => a.issue === folder);
  return {
    issue,
    articles: readingOrder(articles, segments()),
    groups: groupBySegment(articles, segments()),
    lead: pickLead(articles, segments()).lead,
  };
}

export async function getLatest(): Promise<IssueBundle | null> {
  const [first] = await getIssues();
  return first ? getIssue(first.folder) : null;
}

export async function getArticle(
  folder: string,
  slug: string,
): Promise<{ article: Article; bundle: IssueBundle; next: Article | null } | null> {
  const bundle = await getIssue(folder);
  const article = bundle?.articles.find((a) => a.slug === slug);
  if (!bundle || !article) return null;
  return { article, bundle, next: nextArticle(bundle.articles, segments(), slug) };
}

export function segmentFor(key: string): Segment | undefined {
  return segments().find((s) => s.key === key);
}
