import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { articlePatterns, globBase } from '../../src/lib/content-dir';

describe('globBase', () => {
  it('keeps absolute paths absolute', () => {
    expect(globBase('/tmp/fixtures/x')).toBe('/tmp/fixtures/x');
  });
  it('prefixes relative paths with ./', () => {
    expect(globBase('src/content/issues')).toBe('./src/content/issues');
    expect(globBase('./tests/fixtures/minimal')).toBe('./tests/fixtures/minimal');
  });
});

describe('articlePatterns', () => {
  it('lists only <issue>/<folder>/<folder>.md', () => {
    const root = mkdtempSync(join(tmpdir(), 'arwsc-pat-'));
    mkdirSync(join(root, '2026-10/a'), { recursive: true });
    writeFileSync(join(root, '2026-10/a/a.md'), '');
    writeFileSync(join(root, '2026-10/a/notes.md'), '');
    mkdirSync(join(root, '2026-10/b'), { recursive: true });
    writeFileSync(join(root, '2026-10/b/other.md'), '');
    expect(articlePatterns(root)).toEqual(['2026-10/a/a.md']);
  });
  it('returns a never-matching pattern when there is nothing', () => {
    expect(articlePatterns('/nonexistent/x')).toEqual(['__no-articles__/*.md']);
  });
});
