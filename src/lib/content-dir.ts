import { existsSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

/** Folder holding the issues. Tests point this at fixtures; production never sets it. */
export function contentDir(): string {
  return process.env.NEWSLETTER_CONTENT_DIR || 'src/content/issues';
}

export const ISSUE_FOLDER = /^\d{4}-(0[1-9]|1[0-2])$/;

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();

/**
 * Glob patterns (relative to the content folder) for article files: exactly
 * `<issue>/<folder>/<folder>.md`. Listing them explicitly means stray files
 * such as notes.md never become phantom articles.
 */
export function articlePatterns(dir = contentDir()): string[] {
  const root = resolve(dir);
  const out: string[] = [];
  if (!isDir(root)) return ['__no-articles__/*.md'];
  for (const issue of readdirSync(root)) {
    const issuePath = join(root, issue);
    if (!isDir(issuePath) || issue.startsWith('.') || issue.startsWith('_')) continue;
    for (const folder of readdirSync(issuePath)) {
      const file = join(issuePath, folder, `${folder}.md`);
      if (isDir(join(issuePath, folder)) && existsSync(file)) {
        out.push(relative(root, file).split('\\').join('/'));
      }
    }
  }
  return out.length ? out : ['__no-articles__/*.md'];
}

/** Base path for Astro's glob loader: absolute stays absolute, relative gets "./". */
export function globBase(dir = contentDir()): string {
  if (isAbsolute(dir)) return dir;
  return `./${dir.replace(/^\.\//, '')}`;
}
