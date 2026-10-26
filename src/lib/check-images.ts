/**
 * After-build smoke test: every image the generated HTML points at must be a
 * file inside the build output. Checks <img src/srcset>, <source srcset>,
 * og:image and twitter:image.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { parse } from 'node-html-parser';

export interface ImageCheck {
  checked: number;
  missing: { page: string; url: string }[];
}

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const fromSrcset = (v: string) =>
  v
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);

export function checkImages(distDir: string, site: string): ImageCheck {
  const origin = new URL(site).origin;
  const missing: ImageCheck['missing'] = [];
  let checked = 0;
  for (const file of htmlFiles(distDir)) {
    const page = relative(distDir, file).split(sep).join('/');
    const doc = parse(readFileSync(file, 'utf8'));
    const urls: string[] = [];
    for (const img of doc.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (src) urls.push(src);
      const ss = img.getAttribute('srcset');
      if (ss) urls.push(...fromSrcset(ss));
    }
    for (const s of doc.querySelectorAll('source')) {
      const ss = s.getAttribute('srcset');
      if (ss) urls.push(...fromSrcset(ss));
    }
    for (const sel of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      const c = doc.querySelector(sel)?.getAttribute('content');
      if (c) urls.push(c);
    }
    for (const url of urls) {
      checked++;
      if (url.startsWith('data:')) continue;
      let path: string;
      if (/^https?:\/\//i.test(url) || url.startsWith('//')) {
        const u = new URL(url, origin);
        if (u.origin !== origin) {
          missing.push({ page, url });
          continue;
        }
        path = u.pathname;
      } else if (url.startsWith('/')) {
        path = url.split(/[?#]/)[0];
      } else {
        path = '/' + relative(distDir, join(dirname(file), url.split(/[?#]/)[0])).split(sep).join('/');
      }
      let decoded = path;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        /* keep */
      }
      if (!existsSync(join(distDir, decoded))) missing.push({ page, url });
    }
  }
  return { checked, missing };
}
