/** "A", "A and B", "A, B and C". */
export function formatAuthors(authors: readonly string[]): string {
  if (authors.length <= 1) return authors[0] ?? '';
  return `${authors.slice(0, -1).join(', ')} and ${authors[authors.length - 1]}`;
}

export function toArray(v: string | string[]): string[] {
  return (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean);
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
export const formatDate = (d: Date) => dateFmt.format(d);

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatMonth = (d: Date) => monthFmt.format(d);

/** "2026-10" → 1 October 2026 (UTC). */
export function folderToDate(folder: string): Date {
  const [y, m] = folder.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1));
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * Headline text as safe HTML, with a little space before colons and
 * semicolons: display-serif colons sit close to the preceding letter at
 * display sizes. Use with set:html on large headings only.
 */
export function headlineHtml(text: string): string {
  return text
    .split(/([:;])/)
    .map((part) => (part === ':' || part === ';' ? `<span class="pt">${part}</span>` : escapeHtml(part)))
    .join('');
}
