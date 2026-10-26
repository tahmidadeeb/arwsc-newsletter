/**
 * Checks every issue and article before the build and explains problems in
 * plain language. Errors stop the build (the live site keeps running);
 * warnings are printed and the build continues.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { DEFAULT_DATA_DIR, loadThemes, readSegments } from '../data';
import { resolveTheme, type ThemeInput } from '../theme';
import type { Segment } from '../types';
import { checkImage, findImages, type ImageRef } from './images';
import { parseFrontmatter, type Frontmatter } from './frontmatter';
import type { Problem, Report } from './report';

export type { Problem, Report } from './report';
export { formatReport } from './report';

const ISSUE_FOLDER = /^\d{4}-(0[1-9]|1[0-2])$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IGNORED = new Set(['thumbs.db', 'desktop.ini', '.ds_store', '.gitkeep']);
const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();
const ignorable = (name: string) => name.startsWith('.') || name.startsWith('_') || IGNORED.has(name.toLowerCase());

const QUOTE_FIX = 'If the value contains a colon (:) or #, wrap it in double quotes.';

export async function validateContent(contentDir: string, dataDir = DEFAULT_DATA_DIR): Promise<Report> {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const show = (p: string) => {
    const r = relative(process.cwd(), p);
    return !r || r.startsWith('..') ? p : r;
  };
  const error = (file: string, message: string, fix?: string) => errors.push({ file: show(file), message, fix });
  const warn = (file: string, message: string, fix?: string) => warnings.push({ file: show(file), message, fix });

  let segments: Segment[] = [];
  let presets: Record<string, ThemeInput> = {};
  try {
    const r = readSegments(dataDir);
    segments = r.segments;
    r.warnings.forEach((w) => warn(join(dataDir, 'segments.yaml'), w));
  } catch (e) {
    error(join(dataDir, 'segments.yaml'), (e as Error).message);
  }
  try {
    presets = loadThemes(dataDir);
  } catch (e) {
    error(join(dataDir, 'themes.yaml'), (e as Error).message);
  }
  const keys = segments.map((s) => s.key);

  if (!isDir(contentDir)) return { errors, warnings };

  for (const folder of readdirSync(contentDir).sort()) {
    const issueDir = join(contentDir, folder);
    if (ignorable(folder) || !isDir(issueDir)) continue;
    if (!ISSUE_FOLDER.test(folder)) {
      error(issueDir, `The issue folder "${folder}" is not named like YYYY-MM.`, 'Rename it to the year and month, for example 2026-10.');
      continue;
    }

    // ---- issue.md ----
    const issueFile = join(issueDir, 'issue.md');
    if (!existsSync(issueFile)) {
      error(issueDir, 'This issue folder has no issue.md file.', 'Create issue.md with at least issueNumber and title (see README).');
    } else {
      const fm = parseFrontmatter(readFileSync(issueFile, 'utf8'));
      if (!fm.ok) error(issueFile, fm.message, fm.fix);
      else await checkIssue(issueFile, issueDir, fm.data, fm.body);
    }

    // ---- articles ----
    let articleCount = 0;
    let featured: string[] = [];
    const bySegment = new Map<string, { name: string; order?: number }[]>();
    for (const name of readdirSync(issueDir).sort()) {
      const dir = join(issueDir, name);
      if (ignorable(name) || !isDir(dir) || name === 'images') continue;
      const mdFiles = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));
      const expected = `${name}.md`;
      if (!SLUG.test(name)) {
        error(dir, `The article folder "${name}" must use lowercase letters, numbers and hyphens only (no spaces).`,
          `Rename it, e.g. "${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}", and rename the .md file to match.`);
        continue;
      }
      if (!mdFiles.includes(expected)) {
        if (mdFiles.length) {
          error(dir, `The article file must be named ${expected} to match its folder (found ${mdFiles.join(', ')}).`, `Rename the file to ${expected}.`);
        } else {
          error(dir, `This article folder has no ${expected} file.`, `Add the article as ${expected}, or remove the empty folder.`);
        }
        continue;
      }
      for (const extra of mdFiles.filter((f) => f !== expected)) {
        warn(join(dir, extra), `"${extra}" is ignored — only ${expected} is published from this folder.`, 'Delete it if it is not needed.');
      }
      for (const f of readdirSync(dir)) {
        if (!ignorable(f) && !f.toLowerCase().endsWith('.md') && f !== 'images' && !isDir(join(dir, f)) && !f.toLowerCase().endsWith('.txt')) {
          warn(join(dir, f), `"${f}" is outside the images folder and is not used.`, 'Move images into images/ or delete the file.');
        }
      }
      const file = join(dir, expected);
      articleCount++;
      const fm = parseFrontmatter(readFileSync(file, 'utf8'));
      if (!fm.ok) {
        error(file, fm.message, fm.fix);
        continue;
      }
      if (fm.data.featured === true) featured.push(name);
      if (fm.data.draft !== true && typeof fm.data.segment === 'string') {
        const list = bySegment.get(fm.data.segment) ?? [];
        list.push({ name, order: typeof fm.data.order === 'number' ? fm.data.order : undefined });
        bySegment.set(fm.data.segment, list);
      }
      await checkArticle(file, dir, folder, fm.data, fm.body);
    }
    if (articleCount === 0) {
      warn(issueDir, `Issue ${folder} has no articles yet. Its page will say articles are on their way.`);
    }
    if (featured.length > 1) {
      warn(issueDir, `${featured.length} articles are marked featured (${featured.join(', ')}). The one with the lowest "order" becomes the lead story.`,
        'Mark only one article with featured: true.');
    }
    featured = [];
    checkOrder(issueDir, bySegment);
  }

  return { errors, warnings };

  // ---------- helpers ----------

  /** Articles in a section are placed by their order numbers; point out gaps and clashes. */
  function checkOrder(issueDir: string, bySegment: Map<string, { name: string; order?: number }[]>) {
    for (const [key, list] of bySegment) {
      if (list.length < 2) continue;
      const label = segments.find((s) => s.key === key)?.label ?? key;
      const missing = list.filter((a) => a.order === undefined).map((a) => a.name);
      if (missing.length) {
        warn(issueDir, `In ${label}, ${missing.join(', ')} ${missing.length === 1 ? 'has' : 'have'} no order number, so ${missing.length === 1 ? 'it is' : 'they are'} placed after the numbered articles, alphabetically by title.`,
          'Add order: 1, order: 2… to each article in this section to set the order yourself.');
      }
      const seen = new Map<number, string[]>();
      for (const a of list) if (a.order !== undefined) seen.set(a.order, [...(seen.get(a.order) ?? []), a.name]);
      for (const [n, names] of seen) {
        if (names.length > 1) {
          warn(issueDir, `In ${label}, ${names.join(' and ')} both have order: ${n}, so they are placed alphabetically by title.`,
            'Give each article in the section a different order number.');
        }
      }
    }
  }

  function requireString(file: string, data: Frontmatter, field: string, what: string) {
    const v = data[field];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      error(file, `The required field "${field}" is missing or empty.`, `Add a line like: ${field}: ${what}`);
      return false;
    }
    if (typeof v !== 'string') {
      error(file, `The field "${field}" should be text.`, `${QUOTE_FIX} Example: ${field}: "${what}"`);
      return false;
    }
    return true;
  }

  function checkDate(file: string, data: Frontmatter, field: string, required: boolean) {
    const v = data[field];
    if (v === undefined || v === null || v === '') {
      if (required) error(file, `The required field "${field}" is missing.`, `Add a line like: ${field}: 2026-10-05`);
      return;
    }
    const iso = v instanceof Date || /^\d{4}-\d{2}-\d{2}$/.test(String(v).trim());
    const d = v instanceof Date ? v : new Date(String(v));
    if (!iso || Number.isNaN(d.getTime())) {
      error(file, `The ${field} "${String(v)}" is not a date the site understands.`, `Write it as year-month-day, e.g. ${field}: 2026-10-05`);
    }
  }

  async function checkImages(file: string, folder: string, refs: ImageRef[], requireAlt: boolean) {
    for (const ref of refs) {
      for (const p of await checkImage(ref, folder, requireAlt)) {
        (p.level === 'error' ? error : warn)(file, p.message, p.fix);
      }
    }
  }

  async function checkIssue(file: string, dir: string, data: Frontmatter, body: string) {
    const n = data.issueNumber;
    if (n === undefined || n === null) {
      error(file, 'The required field "issueNumber" is missing.', 'Add a line like: issueNumber: 12');
    } else if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
      error(file, `issueNumber must be a whole number (found "${String(n)}").`, 'Write it without quotes, e.g. issueNumber: 12');
    }
    requireString(file, data, 'title', 'The Climate Issue');
    checkDate(file, data, 'publishDate', false);
    if (data.draft !== undefined && typeof data.draft !== 'boolean') {
      error(file, 'draft must be true or false.', 'Write draft: true or draft: false (no quotes).');
    }
    if (data.coverImage !== undefined) {
      if (typeof data.coverAlt !== 'string' || !data.coverAlt.trim()) {
        error(file, 'coverImage is set but coverAlt (a description of the image) is missing.', 'Add a line like: coverAlt: "A description of the cover image"');
      }
      await checkImages(file, dir, [{ url: String(data.coverImage), alt: 'x', where: 'coverImage' }], false);
    }
    // Editor's note: same image rules as articles.
    await checkBodyImages(file, dir, body);
    const t = data.theme as string | ThemeInput | undefined;
    if (t !== undefined && t !== null) {
      if (typeof t !== 'string' && typeof t !== 'object') {
        error(file, 'theme must be a preset name or a list of colours.', `Use e.g. theme: cobalt — presets: ${Object.keys(presets).join(', ')}`);
      } else {
        const r = resolveTheme(t, presets);
        r.errors.forEach((m) => error(file, m));
        r.warnings.forEach((m) => warn(file, m));
      }
    }
  }

  async function checkArticle(file: string, dir: string, issueFolder: string, data: Frontmatter, body: string) {
    requireString(file, data, 'title', '"Your article title"');
    requireString(file, data, 'summary', '"One or two sentences describing the article."');
    // authors: a name or a list of names
    const a = data.authors;
    const treatment = segments.find((s) => s.key === String(data.segment))?.treatment;
    const frontier = treatment === 'frontier';
    const okAuthors =
      (typeof a === 'string' && a.trim()) ||
      (Array.isArray(a) && a.length > 0 && a.every((x) => typeof x === 'string' && x.trim()));
    if (frontier) {
      if (a !== undefined && a !== null) {
        warn(file, 'Frontier entries do not list authors, so the authors line is not shown.', 'Delete the authors line from this file.');
      }
    } else if (!okAuthors) {
      error(file, 'The required field "authors" is missing or empty.', 'Add one name (authors: Ana Rahman) or a list:\nauthors:\n  - Ana Rahman\n  - Bo Chen');
    }
    // segment
    const seg = data.segment;
    if (seg === undefined || seg === null || seg === '') {
      error(file, 'The required field "segment" is missing.', `Add segment: with one of: ${keys.join(', ')}`);
    } else if (!keys.includes(String(seg))) {
      error(file, `The segment "${String(seg)}" does not exist.`, `Use one of: ${keys.join(', ')} (exactly as written).`);
    }
    checkDate(file, data, 'date', false);
    // issue (optional, must match folder)
    if (data.issue !== undefined && data.issue !== null) {
      const v = data.issue instanceof Date ? data.issue.toISOString().slice(0, 7) : String(data.issue);
      if (v !== issueFolder) {
        error(file, `issue is "${v}" but the article is inside the ${issueFolder} folder.`, `Change it to issue: "${issueFolder}", remove the line, or move the folder.`);
      }
    }
    if (data.featured !== undefined && typeof data.featured !== 'boolean') {
      error(file, 'featured must be true or false.', 'Write featured: true (no quotes), or remove the line.');
    }
    if (data.draft !== undefined && typeof data.draft !== 'boolean') {
      error(file, 'draft must be true or false.', 'Write draft: true (no quotes), or remove the line.');
    }
    if (data.order !== undefined && typeof data.order !== 'number') {
      error(file, `order must be a number (found "${String(data.order)}").`, 'Write it without quotes, e.g. order: 2');
    }
    for (const f of ['dek', 'heroAlt', 'heroCaption', 'heroCredit']) {
      if (data[f] !== undefined && data[f] !== null && typeof data[f] !== 'string') {
        error(file, `The field "${f}" should be text.`, QUOTE_FIX);
      }
    }
    // hero image
    if (data.heroImage !== undefined && data.heroImage !== null) {
      if (typeof data.heroAlt !== 'string' || !data.heroAlt.trim()) {
        error(file, 'heroImage is set but heroAlt (a description of the image) is missing.', 'Add a line like: heroAlt: "Researchers sampling river water"');
      }
      await checkImages(file, dir, [{ url: String(data.heroImage), alt: 'x', where: 'heroImage' }], false);
    }
    await checkBodyImages(file, dir, body);
  }

  async function checkBodyImages(file: string, dir: string, body: string) {
    if (/data:image\//i.test(body) && !findImages(body).some((r) => /^data:/i.test(r.url))) {
      error(file, 'The text contains an embedded data:image string (a picture pasted as code).', "Save the picture as a file in images/ and refer to it as ![description](images/file-name.jpg).");
    }
    await checkImages(file, dir, findImages(body), true);
  }
}
