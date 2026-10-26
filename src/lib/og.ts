/**
 * Build-time share images (1200×630 PNG) for pages without a photo.
 * Rendered with satori (layout → SVG) and resvg (SVG → PNG). Text is passed
 * as plain strings, never parsed as HTML, so any characters are safe.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { ThemeTokens } from './theme';

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFileSync(require.resolve(`${pkg}/files/${file}`));

let fonts: Parameters<typeof satori>[1]['fonts'] | undefined;
function loadFonts() {
  return (fonts ??= [
    { name: 'Display', data: font('@fontsource/playfair-display', 'playfair-display-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Display', data: font('@fontsource/playfair-display', 'playfair-display-latin-ext-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'Display', data: font('@fontsource/playfair-display', 'playfair-display-latin-400-italic.woff'), weight: 400, style: 'italic' },
    { name: 'Display', data: font('@fontsource/playfair-display', 'playfair-display-latin-ext-400-italic.woff'), weight: 400, style: 'italic' },
    // Greek letters (β, μ, Δ…) are common in science headlines; Noto Serif supplies them.
    { name: 'GreekSerif', data: font('@fontsource/noto-serif', 'noto-serif-greek-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'GreekSerif', data: font('@fontsource/noto-serif', 'noto-serif-greek-400-italic.woff'), weight: 400, style: 'italic' },
    { name: 'Schibsted', data: font('@fontsource/schibsted-grotesk', 'schibsted-grotesk-latin-600-normal.woff'), weight: 600, style: 'normal' },
    { name: 'Schibsted', data: font('@fontsource/schibsted-grotesk', 'schibsted-grotesk-latin-ext-600-normal.woff'), weight: 600, style: 'normal' },
  ]);
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/**
 * Keeps only characters the bundled fonts can draw: Latin, Latin Extended,
 * punctuation and Greek. Anything else (emoji, other scripts) is dropped so
 * share images never show empty boxes.
 */
const DRAWABLE = /[\u0000-\u024F\u02B0-\u036F\u0370-\u03FF\u1E00-\u1EFF\u2000-\u206F\u20A0-\u20C0\u2100-\u214F\u2190-\u21FF\u2200-\u22FF]/u;
export function ogText(s: string): string {
  return Array.from(s)
    .filter((ch) => DRAWABLE.test(ch))
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
const drawable = ogText;

export interface OgInput {
  title: string;
  kicker: string;
  glyph: string;
  theme: ThemeTokens;
}

export async function renderOg({ title, kicker, glyph, theme }: OgInput): Promise<Buffer> {
  const t = drawable(title) || 'the arw,sc newsletter';
  const size = t.length > 90 ? 48 : t.length > 55 ? 60 : 74;
  const tree = h(
    'div',
    { width: 1200, height: 630, display: 'flex', background: theme.paper, color: theme.ink },
    [
      h(
        'div',
        {
          width: 380,
          height: 630,
          flexShrink: 0,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: theme.accent,
          color: theme.onAccent,
        },
        [
          h(
            'div',
            {
              position: 'absolute',
              left: -18,
              bottom: -150,
              fontFamily: 'Display, GreekSerif',
              fontStyle: 'italic',
              fontSize: 520,
              lineHeight: 1,
              display: 'flex',
            },
            drawable(glyph).slice(0, 3) || '§',
          ),
        ],
      ),
      h(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px 52px',
          flexGrow: 1,
          alignSelf: 'stretch',
        },
        [
          h('div', { fontFamily: 'Schibsted', fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', color: theme.accentText, display: 'flex' }, drawable(kicker)),
          h('div', { fontFamily: 'Display, GreekSerif', fontWeight: 500, fontSize: size, lineHeight: 1.04, display: 'flex' }, t),
          h(
            'div',
            { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `2px solid ${theme.ink}`, paddingTop: 18 },
            [
              h('div', { fontFamily: 'Display, GreekSerif', fontStyle: 'italic', fontSize: 34, display: 'flex' }, 'the arw,sc newsletter'),
              h('div', { fontFamily: 'Schibsted', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', display: 'flex' }, 'Academic and Research Wing'),
            ],
          ),
        ],
      ),
    ],
  );
  // satori's types expect React elements; our plain objects have the same shape.
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
