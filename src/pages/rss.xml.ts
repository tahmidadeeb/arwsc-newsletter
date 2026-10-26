import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getAllArticles, getIssues, segmentFor } from '../lib/content';
import { loadSite } from '../lib/data';
import { articleUrl, SITE_TITLE } from '../lib/nav';

export const GET: APIRoute = async (context) => {
  const site = loadSite();
  const issues = new Map((await getIssues()).map((i) => [i.folder, i]));
  const articles = (await getAllArticles())
    .filter((a) => issues.has(a.issue))
    .sort((a, b) => {
      const d = issues.get(b.issue)!.publishDate.getTime() - issues.get(a.issue)!.publishDate.getTime();
      return d !== 0 ? d : b.date.getTime() - a.date.getTime();
    })
    .slice(0, 50);

  return rss({
    title: SITE_TITLE,
    description: site.tagline || site.clubName,
    site: context.site ?? 'http://localhost:4321',
    trailingSlash: true,
    items: articles.map((a) => ({
      title: a.title,
      link: articleUrl(a.issue, a.slug),
      pubDate: a.date,
      description: a.dek ?? a.summary,
      ...(a.authors.length > 0 ? { author: a.authors.join(', ') } : {}),
      categories: [segmentFor(a.segment)?.label ?? a.segment],
    })),
    customData: '<language>en</language>',
  });
};
