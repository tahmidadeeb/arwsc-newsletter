/** Colour helpers: hex parsing, WCAG contrast, OKLCH-based darkening, mixing. */

export type RGB = [number, number, number];

export function parseHex(input: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(input).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

export function toHex([r, g, b]: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function mustParse(hex: string): RGB {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`Not a hex colour: ${hex}`);
  return rgb;
}

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (c: number) => {
  const s = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return s * 255;
};

export function luminance(hex: string): number {
  const [r, g, b] = mustParse(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// OKLab <-> linear sRGB (Björn Ottosson)
function rgbToOklab([r, g, b]: RGB): [number, number, number] {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]: [number, number, number]): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Lowers OKLCH lightness in 0.01 steps until `fg` reaches `target` contrast on `bg`. */
export function darkenUntil(fg: string, bg: string, target: number): string {
  if (contrast(fg, bg) >= target) return toHex(mustParse(fg));
  const [L, a, b] = rgbToOklab(mustParse(fg));
  for (let step = L; step > 0; step -= 0.01) {
    // Reduce chroma slightly as we darken so the colour stays in gamut.
    const k = Math.max(0, step / L);
    const candidate = toHex(oklabToRgb([step, a * (0.6 + 0.4 * k), b * (0.6 + 0.4 * k)]));
    if (contrast(candidate, bg) >= target) return candidate;
  }
  return '#000000';
}

/** Linear mix in OKLab: t=0 gives a, t=1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const A = rgbToOklab(mustParse(a));
  const B = rgbToOklab(mustParse(b));
  return toHex(oklabToRgb([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t) as [number, number, number]));
}
