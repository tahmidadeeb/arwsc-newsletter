export const SITE_TITLE = 'the arw,sc newsletter';

export const NAV = [
  { href: '/', label: 'Latest' },
  { href: '/issues/', label: 'Archive' },
  { href: '/about/', label: 'About' },
  { href: '/team/', label: 'Team' },
  { href: '/contact/', label: 'Contact' },
] as const;

/** Two-digit index for specimen tags and dispatch numbers. */
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Roman numerals for volume labels. */
export function roman(n: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

export const issueUrl = (folder: string) => `/issues/${folder}/`;
export const articleUrl = (folder: string, slug: string) => `/issues/${folder}/${slug}/`;
