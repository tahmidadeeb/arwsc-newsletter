import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

export const ISSUE_MD = '---\nissueNumber: 1\ntitle: Test Issue\n---\n';

export function article(fields: Record<string, string | undefined> = {}, body = 'Body text.\n'): string {
  const base: Record<string, string | undefined> = {
    title: 'A Good Title',
    authors: 'Ana Rahman',
    segment: 'feature',
    date: '2026-10-05',
    summary: 'A short summary.',
    ...fields,
  };
  const lines = Object.entries(base)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

/** Files map: relative path → string content, or { image: [w, h] } for a generated JPEG. */
export type Files = Record<string, string | { image: [number, number] } | Buffer>;

export async function makeContent(files: Files): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'arwsc-content-'));
  for (const [rel, body] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    if (typeof body === 'string' || Buffer.isBuffer(body)) writeFileSync(p, body);
    else {
      const [width, height] = body.image;
      await sharp({ create: { width, height, channels: 3, background: '#335577' } }).jpeg().toFile(p);
    }
  }
  return root;
}

/** One valid issue with one valid article; override or add files as needed. */
export async function oneArticle(md: string, extra: Files = {}): Promise<string> {
  return makeContent({ '2026-10/issue.md': ISSUE_MD, '2026-10/my-article/my-article.md': md, ...extra });
}
