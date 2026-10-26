import { contrast, darkenUntil, mix, parseHex, toHex } from './color';

export interface ThemeInput {
  preset?: string;
  accent?: string;
  background?: string;
  ink?: string;
  secondary?: string;
}

export interface ThemeTokens {
  paper: string;
  ink: string;
  accent: string;
  accentText: string;
  onAccent: string;
  secondary: string;
  rule: string;
}

export interface ResolvedTheme {
  tokens: ThemeTokens;
  errors: string[];
  warnings: string[];
}

const FIELDS = ['accent', 'background', 'ink', 'secondary'] as const;
const AA = 4.5;

const FALLBACK: Required<Omit<ThemeInput, 'preset' | 'secondary'>> = {
  accent: '#1f3a5f',
  background: '#f6f1e7',
  ink: '#16130f',
};

const fmt = (n: number) => `${n.toFixed(2)}:1`;

/**
 * Merges brand → preset → the issue's own values, then checks contrast.
 * Never throws: problems come back as plain-language errors/warnings and
 * the tokens always fall back to something usable.
 */
export function resolveTheme(
  input: string | ThemeInput | undefined | null,
  presets: Record<string, ThemeInput>,
): ResolvedTheme {
  const errors: string[] = [];
  const warnings: string[] = [];
  const names = Object.keys(presets);
  const brand = { ...FALLBACK, ...(presets.brand ?? {}) };

  const own: ThemeInput = typeof input === 'string' ? { preset: input } : { ...(input ?? {}) };
  let base: ThemeInput = {};
  if (own.preset !== undefined) {
    if (presets[own.preset]) base = presets[own.preset];
    else
      errors.push(
        `The theme "${own.preset}" does not exist. Choose one of: ${names.join(', ')} ` +
          `— or give your own colours (accent, background, ink).`,
      );
  }

  const merged: Record<string, string | undefined> = { ...brand, ...base };
  for (const f of FIELDS) {
    const v = own[f];
    if (v === undefined || v === null) continue;
    if (!parseHex(String(v))) {
      errors.push(
        `The theme colour "${f}: ${v}" is not a hex colour. Write it like "#1d3fbf" (in quotes).`,
      );
    } else merged[f] = String(v);
  }
  // Any invalid preset colour falls back to brand.
  for (const f of ['accent', 'background', 'ink'] as const) {
    if (!parseHex(merged[f] ?? '')) merged[f] = brand[f] ?? FALLBACK[f];
  }

  const paper = toHex(parseHex(merged.background!)!);
  const ink = toHex(parseHex(merged.ink!)!);
  const accent = toHex(parseHex(merged.accent!)!);

  const inkRatio = contrast(ink, paper);
  if (inkRatio < AA) {
    const suggestion = darkenUntil(ink, paper, 7);
    errors.push(
      `Body text colour ${ink} on background ${paper} has contrast ${fmt(inkRatio)}, ` +
        `below the 4.5:1 minimum for readable text. Use a darker ink such as "${suggestion}" ` +
        `or a lighter background.`,
    );
  }

  // --ink-soft (dates, captions, summaries) is ink mixed 74% into paper.
  const inkSoft = mix(ink, paper, 0.26);
  const softRatio = contrast(inkSoft, paper);
  if (inkRatio >= AA && softRatio < AA) {
    let suggestion = ink;
    for (let t = 0; t < 1 && contrast(mix(suggestion, paper, 0.26), paper) < AA; t += 0.05) suggestion = darkenUntil(ink, paper, inkRatio + 1 + t * 10);
    errors.push(
      `Body text colour ${ink} is readable, but the softer secondary text made from it (dates, captions, summaries) ` +
        `only reaches ${fmt(softRatio)} on ${paper}, below 4.5:1. Use a darker ink such as "${suggestion}".`,
    );
  }

  let accentText = accent;
  const accentRatio = contrast(accent, paper);
  if (accentRatio < AA) {
    accentText = darkenUntil(accent, paper, AA);
    warnings.push(
      `The accent colour ${accent} is too light to use as text on ${paper} ` +
        `(contrast ${fmt(accentRatio)}, needs 4.5:1). Links and labels will use ${accentText} instead. ` +
        `To choose yourself, set accent to a darker colour such as "${accentText}".`,
    );
  }

  const onAccent = contrast(ink, accent) >= contrast(paper, accent) ? ink : paper;
  const onRatio = contrast(onAccent, accent);
  if (onRatio < AA) {
    warnings.push(
      `Text on the accent-coloured cover (${onAccent} on ${accent}) has contrast ${fmt(onRatio)}, ` +
        `below 4.5:1. Choose a darker or lighter accent so cover text stays readable.`,
    );
  }

  const secondary =
    merged.secondary && parseHex(merged.secondary) ? toHex(parseHex(merged.secondary)!) : mix(accent, ink, 0.35);

  return {
    tokens: {
      paper,
      ink,
      accent,
      accentText,
      onAccent,
      secondary,
      rule: 'color-mix(in oklab, var(--ink) 18%, transparent)',
    },
    errors,
    warnings,
  };
}

/** Inline style string that applies a theme to an element and its children. */
export function themeStyle(t: ThemeTokens): string {
  return [
    `--paper:${t.paper}`,
    `--ink:${t.ink}`,
    `--accent:${t.accent}`,
    `--accent-text:${t.accentText}`,
    `--on-accent:${t.onAccent}`,
    `--secondary:${t.secondary}`,
    `--rule:${t.rule}`,
  ].join(';');
}
