import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkImages } from '../../src/lib/check-images';

function dist(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'arwsc-dist-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), body);
  }
  return root;
}

const SITE = 'https://site.example';

describe('checkImages', () => {
  it('finds a missing file referenced in srcset', () => {
    const d = dist({
      'a.png': 'x',
      'index.html': '<img src="/a.png" srcset="/a.png 1x, /b.png 2x" alt="">',
    });
    const r = checkImages(d, SITE);
    expect(r.missing).toEqual([{ page: 'index.html', url: '/b.png' }]);
    expect(r.checked).toBe(3);
  });
  it('accepts absolute og:image URLs on the site origin when the file exists', () => {
    const d = dist({ 'og/x.png': 'x', 'p/index.html': `<meta property="og:image" content="${SITE}/og/x.png">` });
    expect(checkImages(d, SITE).missing).toEqual([]);
  });
  it('checks twitter:image and <source srcset> and decodes URL escapes', () => {
    const d = dist({
      'img/a b.webp': 'x',
      'index.html': `<picture><source srcset="/img/a%20b.webp 640w"></picture><meta name="twitter:image" content="${SITE}/nope.png">`,
    });
    expect(checkImages(d, SITE).missing.map((m) => m.url)).toEqual([`${SITE}/nope.png`]);
  });
  it('treats images on other sites as missing (all images must be local)', () => {
    const d = dist({ 'index.html': '<img src="https://cdn.example.com/x.jpg" alt="">' });
    expect(checkImages(d, SITE).missing).toHaveLength(1);
  });
  it('resolves relative URLs against the page folder', () => {
    const d = dist({ 'p/pic.jpg': 'x', 'p/index.html': '<img src="pic.jpg" alt="">' });
    expect(checkImages(d, SITE).missing).toEqual([]);
  });
});
