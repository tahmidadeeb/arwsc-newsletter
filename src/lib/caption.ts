export interface ImageTitle {
  caption?: string;
  credit?: string;
  wide: boolean;
}

/**
 * Reads the Markdown image title: `"[wide] Caption | Credit"`.
 * `[wide]` at the start makes a full-width figure; text after the last
 * " | " is the credit.
 */
export function parseImageTitle(title: string | null | undefined): ImageTitle {
  let t = (title ?? '').trim();
  const out: ImageTitle = { wide: false };
  if (/^\[wide\]/i.test(t)) {
    out.wide = true;
    t = t.replace(/^\[wide\]\s*/i, '');
  }
  if (!t) return out;
  const i = t.lastIndexOf(' | ');
  if (i >= 0) {
    const caption = t.slice(0, i).trim();
    const credit = t.slice(i + 3).trim();
    if (caption) out.caption = caption;
    if (credit) out.credit = credit;
  } else out.caption = t;
  return out;
}
