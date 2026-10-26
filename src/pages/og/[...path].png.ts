import type { APIRoute, GetStaticPaths } from 'astro';
import { brandTheme, getAllArticles, getIssues, segmentFor } from '../../lib/content';
import { renderOg, type OgInput } from '../../lib/og';
import { loadSite } from '../../lib/data';

export const getStaticPaths = (async () => {
  const brand = brandTheme();
  const club = loadSite().clubName;
  const issues = await getIssues();
  const byFolder = new Map(issues.map((i) => [i.folder, i]));
  const pages: { params: { path: string }; props: OgInput & Record<string, unknown> }[] = [
    { params: { path: 'home' }, props: { title: 'Research, ideas and discoveries', kicker: club, glyph: '¶', theme: brand } },
    { params: { path: 'issues' }, props: { title: 'The archive', kicker: 'Every issue', glyph: '§', theme: brand } },
    { params: { path: 'about' }, props: { title: 'About the club', kicker: 'Academic and Research Wing', glyph: 'A', theme: brand } },
    { params: { path: 'team' }, props: { title: 'Editorial team', kicker: 'Masthead', glyph: 'E', theme: brand } },
    { params: { path: 'contact' }, props: { title: 'Contact & join', kicker: 'Get in touch', glyph: '@', theme: brand } },
  ];
  for (const i of issues) {
    pages.push({
      params: { path: `issues/${i.folder}` },
      props: { title: i.title, kicker: `Issue No. ${i.issueNumber} · ${i.monthLabel}`, glyph: String(i.issueNumber), theme: i.theme },
    });
  }
  for (const a of await getAllArticles()) {
    const issue = byFolder.get(a.issue);
    if (!issue) continue;
    pages.push({
      params: { path: `issues/${a.issue}/${a.slug}` },
      props: {
        title: a.title,
        kicker: `${segmentFor(a.segment)?.label ?? ''} · Issue No. ${issue.issueNumber}`,
        glyph: a.title.replace(/^[^\p{L}\p{N}]+/u, '').charAt(0).toUpperCase(),
        theme: issue.theme,
      },
    });
  }
  return pages;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as OgInput);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
