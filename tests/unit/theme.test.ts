import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { contrast, darkenUntil, parseHex } from '../../src/lib/color';
import { resolveTheme, themeStyle, type ThemeInput } from '../../src/lib/theme';

const presets = parse(readFileSync('src/data/themes.yaml', 'utf8')) as Record<string, ThemeInput>;

describe('color', () => {
  it('parses short and long hex, rejects names', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#1D3FBF')).toEqual([29, 63, 191]);
    expect(parseHex('blue')).toBeNull();
  });
  it('computes WCAG contrast', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 1);
    expect(contrast('#777', '#fff')).toBeLessThan(4.5);
  });
  it('darkens a colour until it reaches the target contrast', () => {
    const out = darkenUntil('#ffd400', '#f6f1e7', 4.5);
    expect(contrast(out, '#f6f1e7')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('resolveTheme', () => {
  it('returns the brand theme when no theme is given', () => {
    const r = resolveTheme(undefined, presets);
    expect(r.errors).toEqual([]);
    expect(r.tokens.accent.toLowerCase()).toBe(presets.brand.accent!.toLowerCase());
    expect(r.tokens.paper.toLowerCase()).toBe(presets.brand.background!.toLowerCase());
  });
  it('warns and auto-darkens a low-contrast accent', () => {
    const r = resolveTheme({ accent: '#ffd400' }, presets);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('accent');
    expect(r.warnings[0]).toMatch(/#[0-9a-f]{6}/i);
    expect(contrast(r.tokens.accentText, r.tokens.paper)).toBeGreaterThanOrEqual(4.5);
    expect(r.tokens.accent.toLowerCase()).toBe('#ffd400');
  });
  it('errors when body text fails 4.5:1', () => {
    const r = resolveTheme({ ink: '#ddd' }, presets);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('4.5:1');
  });
  it('errors on an unknown preset and lists valid names', () => {
    const r = resolveTheme('nope', presets);
    expect(r.errors[0]).toContain('cobalt');
  });
  it('errors on an invalid colour and names the field', () => {
    const r = resolveTheme({ accent: 'blue' }, presets);
    expect(r.errors[0]).toContain('accent');
  });
  it('accepts a preset with overrides', () => {
    const r = resolveTheme({ preset: 'cobalt', ink: '#000000' }, presets);
    expect(r.errors).toEqual([]);
    expect(r.tokens.accent.toLowerCase()).toBe(presets.cobalt.accent!.toLowerCase());
    expect(r.tokens.ink).toBe('#000000');
  });
  it('picks the higher-contrast text colour for the accent block', () => {
    const dark = resolveTheme({ accent: '#102030' }, presets).tokens;
    expect(dark.onAccent).toBe(dark.paper);
    const light = resolveTheme({ accent: '#ffd400' }, presets).tokens;
    expect(light.onAccent).toBe(light.ink);
  });
  it.each(Object.keys(presets))('preset %s resolves with no errors or warnings', (name) => {
    const r = resolveTheme(name, presets);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});

describe('themeStyle', () => {
  it('emits every CSS custom property', () => {
    const s = themeStyle(resolveTheme('cobalt', presets).tokens);
    for (const v of ['--paper', '--ink', '--accent', '--accent-text', '--on-accent', '--secondary', '--rule']) {
      expect(s).toContain(`${v}:`);
    }
  });
});

describe('resolveTheme — secondary text contrast', () => {
  it('errors when the softened text colour used for dates and captions drops below 4.5:1', () => {
    const r = resolveTheme({ background: '#ffffff', ink: '#707070' }, presets);
    expect(r.errors.join(' ')).toMatch(/secondary text/i);
  });
});
