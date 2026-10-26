import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Built {
  out: string;
  log: string;
  html: (path: string) => string;
  file: (path: string) => string;
  exists: (path: string) => boolean;
}

/** Builds the site from a content folder into a temporary output folder. */
export function buildSite(contentDir: string, env: Record<string, string> = {}): Built {
  const out = mkdtempSync(join(tmpdir(), 'arwsc-out-'));
  const log = execFileSync('npx', ['astro', 'build', '--outDir', out], {
    env: { ...process.env, NEWSLETTER_CONTENT_DIR: contentDir, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const file = (p: string) => readFileSync(join(out, p), 'utf8');
  return {
    out,
    log,
    file,
    html: (p: string) => file(join(p, 'index.html')),
    exists: (p: string) => existsSync(join(out, p)),
  };
}
