/**
 * Dev-only: draws the abstract placeholder images used by the sample issues.
 * Run once; the JPEGs are committed. Not part of the build.
 *
 *   tsx scripts/make-placeholders.ts
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

type Kind = 'rings' | 'lattice' | 'waves' | 'cells' | 'contours';

function svg(kind: Kind, w: number, h: number, bg: string, fg: string, accent: string): string {
  const parts: string[] = [];
  let seed = w * 7 + h * 13 + kind.length * 101;
  const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  if (kind === 'rings') {
    const cx = w * 0.62, cy = h * 0.55;
    for (let i = 1; i < 40; i++) parts.push(`<circle cx="${cx}" cy="${cy}" r="${i * 22}" fill="none" stroke="${i % 5 ? fg : accent}" stroke-opacity="${i % 5 ? 0.35 : 0.9}" stroke-width="${i % 5 ? 1.2 : 3}"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="70" fill="${accent}"/>`);
  } else if (kind === 'lattice') {
    for (let y = 0; y < h + 60; y += 52) for (let x = (y / 52) % 2 ? 30 : 0; x < w + 60; x += 60) {
      parts.push(`<circle cx="${x}" cy="${y}" r="${4 + r() * 9}" fill="${r() > 0.86 ? accent : fg}" fill-opacity="0.8"/>`);
      parts.push(`<line x1="${x}" y1="${y}" x2="${x + 30}" y2="${y + 52}" stroke="${fg}" stroke-opacity="0.25"/>`);
      parts.push(`<line x1="${x}" y1="${y}" x2="${x + 60}" y2="${y}" stroke="${fg}" stroke-opacity="0.25"/>`);
    }
  } else if (kind === 'waves') {
    const sources = [[w * 0.3, h * 0.4], [w * 0.7, h * 0.65]];
    for (const [sx, sy] of sources) for (let i = 1; i < 45; i++) parts.push(`<circle cx="${sx}" cy="${sy}" r="${i * 26}" fill="none" stroke="${fg}" stroke-opacity="0.28" stroke-width="2"/>`);
    parts.push(`<line x1="0" y1="${h * 0.52}" x2="${w}" y2="${h * 0.52}" stroke="${accent}" stroke-width="4"/>`);
  } else if (kind === 'cells') {
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 70;
      parts.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="${i % 9 ? fg : accent}" fill-opacity="${i % 9 ? 0.12 : 0.75}" stroke="${fg}" stroke-opacity="0.5"/>`);
      parts.push(`<circle cx="${x + rad * 0.2}" cy="${y - rad * 0.15}" r="${rad * 0.22}" fill="${fg}" fill-opacity="0.45"/>`);
    }
  } else {
    for (let i = 0; i < 26; i++) {
      const y0 = (h / 26) * i;
      let d = `M0 ${y0}`;
      for (let x = 0; x <= w; x += 40) d += ` L${x} ${y0 + Math.sin(x / 160 + i * 0.5) * 34 + Math.cos(x / 70 + i) * 10}`;
      parts.push(`<path d="${d}" fill="none" stroke="${i % 6 ? fg : accent}" stroke-opacity="${i % 6 ? 0.45 : 1}" stroke-width="${i % 6 ? 1.4 : 3}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/>${parts.join('')}</svg>`;
}

const GREEN = ['#16392a', '#d9e8cf', '#c9a227'] as const;
const BLUE = ['#0f1f5c', '#cfd8f5', '#e4572e'] as const;
const PAPER = ['#efe9dc', '#1b2a3a', '#1d3fbf'] as const;

const jobs: [string, Kind, number, number, readonly [string, string, string]][] = [
  ['src/content/issues/2026-09/what-the-river-remembers/images/delta-rings.jpg', 'rings', 1600, 1000, GREEN],
  ['src/content/issues/2026-09/what-the-river-remembers/images/sampling-contours.jpg', 'contours', 1600, 900, PAPER],
  ['src/content/issues/2026-10/images/cover-lattice.jpg', 'lattice', 1600, 1200, BLUE],
  ['src/content/issues/2026-10/resistance-in-the-ward/images/ward-cells.jpg', 'cells', 1600, 1000, BLUE],
  ['src/content/issues/2026-10/resistance-in-the-ward/images/culture-plates.jpg', 'rings', 1200, 900, PAPER],
  ['src/content/issues/2026-10/resistance-in-the-ward/images/surveillance-waves.jpg', 'waves', 2000, 900, BLUE],
  ['src/content/issues/2026-10/the-quiet-lab/images/bench-lattice.jpg', 'lattice', 1600, 1000, PAPER],
];

for (const [out, kind, w, h, [bg, fg, accent]] of jobs) {
  mkdirSync(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg(kind, w, h, bg, fg, accent))).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
  console.log('wrote', out);
}
