import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSegments, loadSite, loadTeam, loadThemes, readSegments } from '../../src/lib/data';
import { formatAuthors } from '../../src/lib/format';

function dataDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'arwsc-data-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

describe('formatAuthors', () => {
  it('joins one, two and three names', () => {
    expect(formatAuthors(['A'])).toBe('A');
    expect(formatAuthors(['A', 'B'])).toBe('A and B');
    expect(formatAuthors(['A', 'B', 'C'])).toBe('A, B and C');
  });
});

describe('segments', () => {
  it('loads the seeded segments in order', () => {
    expect(loadSegments().map((s) => s.key)).toEqual(['announcements', 'feature', 'opinion', 'frontier']);
  });
  it('rejects duplicate keys', () => {
    const dir = dataDir({
      'segments.yaml': '- {key: a, label: A, order: 1}\n- {key: a, label: B, order: 2}\n',
    });
    expect(() => loadSegments(dir)).toThrow(/duplicate/i);
  });
  it('falls back to standard for an unknown treatment, with a warning', () => {
    const dir = dataDir({ 'segments.yaml': '- {key: a, label: A, order: 1, treatment: fancy}\n' });
    const r = readSegments(dir);
    expect(r.segments[0].treatment).toBe('standard');
    expect(r.warnings[0]).toContain('fancy');
  });
  it('defaults a missing treatment to standard without warning', () => {
    const r = readSegments(dataDir({ 'segments.yaml': '- {key: a, label: A, order: 1}\n' }));
    expect(r.segments[0].treatment).toBe('standard');
    expect(r.warnings).toEqual([]);
  });
});

describe('team, site, themes', () => {
  it('accepts a team member without a photo', () => {
    const dir = dataDir({ 'team.yaml': '- {name: Rumi, role: Editor}\n' });
    expect(loadTeam(dir)).toEqual([{ name: 'Rumi', role: 'Editor' }]);
  });
  it('accepts an empty team file', () => {
    expect(loadTeam(dataDir({ 'team.yaml': '' }))).toEqual([]);
  });
  it('explains a team member with no role', () => {
    const dir = dataDir({ 'team.yaml': '- {name: Rumi}\n' });
    expect(() => loadTeam(dir)).toThrow(/role/);
  });
  it('loads the seeded site and themes', () => {
    expect(loadSite().shortName).toBe('ARW,SC');
    expect(Object.keys(loadThemes())).toContain('brand');
  });
});

describe('editable site text', () => {
  it('fills in sensible defaults when optional text is missing', () => {
    const dir = dataDir({ 'site.yaml': 'clubName: C\nshortName: S\n' });
    const s = loadSite(dir);
    expect(s.team.intro).toMatch(/edit/);
    expect(s.contact.note).toBeTruthy();
    expect(s.signup.heading).toBeTruthy();
    expect(s.signup.success).toMatch(/inbox/);
    expect(s.notFound.text).toBeTruthy();
  });
  it('uses the text written in site.yaml', () => {
    const dir = dataDir({ 'site.yaml': 'clubName: C\nshortName: S\nteam:\n  intro: Our editors.\nsignup:\n  heading: Join the list\n' });
    const s = loadSite(dir);
    expect(s.team.intro).toBe('Our editors.');
    expect(s.signup.heading).toBe('Join the list');
    expect(s.signup.privacy).toBeTruthy();
  });
  it('the shipped site.yaml has every editable text filled in', () => {
    const s = loadSite();
    expect(s.join.text).toBeTruthy();
    expect(s.team.intro).toBeTruthy();
  });
});

describe('segment descriptions', () => {
  it('reads an optional description for each segment', () => {
    const r = readSegments(dataDir({ 'segments.yaml': '- {key: a, label: A, order: 1, description: About A}\n- {key: b, label: B, order: 2}\n' }));
    expect(r.segments[0].description).toBe('About A');
    expect(r.segments[1].description).toBeUndefined();
  });
});
