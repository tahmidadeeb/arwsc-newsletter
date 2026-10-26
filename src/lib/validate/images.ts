import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, normalize, relative, sep } from 'node:path';
import sharp from 'sharp';

export const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
export const IMAGE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(jpe?g|png|webp)$/;
export const MAX_SIDE = 4000;
export const MAX_BYTES = 5 * 1024 * 1024;

export interface ImageRef {
  url: string;
  alt?: string;
  title?: string;
  /** Where it was found, for messages: "image ![…](…)" or "heroImage". */
  where: string;
}

export interface ImageProblem {
  level: 'error' | 'warning';
  message: string;
  fix?: string;
}

/**
 * Markdown images `![alt](url "title")` (including `<url with spaces>`)
 * and raw HTML `<img src="…">`.
 */
export function findImages(body: string): ImageRef[] {
  const out: ImageRef[] = [];
  const md = /!\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+"([\s\S]*?)"\s*)?\)/g;
  for (const m of body.matchAll(md)) {
    const url = m[2].startsWith('<') ? m[2].slice(1, -1) : m[2];
    out.push({ url, alt: m[1], title: m[3], where: `image ${m[0].length > 70 ? m[0].slice(0, 67) + '…' : m[0]}` });
  }
  for (const m of body.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(m[0])?.[1];
    out.push({ url: m[1], alt, where: `HTML image ${m[0].slice(0, 60)}` });
  }
  return out;
}

/** Walks each path segment and checks its exact spelling, including capitals. */
function exactPath(root: string, rel: string): { exists: boolean; caseMismatch?: string } {
  let cur = root;
  const parts = rel.split(/[\\/]/).filter((p) => p && p !== '.');
  const fixed: string[] = [];
  for (const part of parts) {
    if (!existsSync(cur) || !statSync(cur).isDirectory()) return { exists: false };
    const entries = readdirSync(cur);
    if (entries.includes(part)) {
      fixed.push(part);
      cur = join(cur, part);
      continue;
    }
    const ci = entries.find((e) => e.toLowerCase() === part.toLowerCase());
    if (!ci) return { exists: false };
    fixed.push(ci);
    cur = join(cur, ci);
    return { exists: false, caseMismatch: [...fixed, ...parts.slice(fixed.length)].join('/') };
  }
  return { exists: existsSync(cur) && statSync(cur).isFile() };
}

export async function checkImage(ref: ImageRef, folder: string, requireAlt: boolean): Promise<ImageProblem[]> {
  const p: ImageProblem[] = [];
  const { url } = ref;
  if (requireAlt && !ref.alt?.trim()) {
    p.push({
      level: 'error',
      message: `The ${ref.where} has no alt text.`,
      fix: 'Describe the image between the square brackets, e.g. ![Cells dividing under a microscope](images/cells.jpg). Screen-reader users rely on it.',
    });
  }
  if (ref.title && ref.title.includes('"')) {
    p.push({
      level: 'error',
      message: `The caption in ${ref.where} contains straight double quotes ("), which break the image.`,
      fix: 'Use typographic quotes “like this” or single quotes \'like this\' inside captions.',
    });
  }
  if (/^data:/i.test(url)) {
    p.push({
      level: 'error',
      message: `The ${ref.where.slice(0, 40)}… is embedded in the text as a data:image string instead of being a file.`,
      fix: "Save the picture as a .jpg or .png file in the article's images folder and refer to it as images/file-name.jpg.",
    });
    return p;
  }
  if (/^[a-z]+:\/\//i.test(url) || url.startsWith('//')) {
    p.push({
      level: 'error',
      message: `The ${ref.where} points to a web address (${url}). Images must be a file inside the article's images folder.`,
      fix: 'Download the image (with permission), put it in images/, and write images/file-name.jpg.',
    });
    return p;
  }
  let decoded = url;
  try {
    decoded = decodeURI(url);
  } catch {
    /* keep raw */
  }
  const norm = normalize(decoded);
  if (isAbsolute(decoded) || norm.startsWith('..' + sep) || norm === '..') {
    p.push({
      level: 'error',
      message: `The ${ref.where} uses the path "${url}". Images must be a file inside the article's images folder.`,
      fix: 'Write the path as images/file-name.jpg.',
    });
    return p;
  }
  const ext = extname(decoded).toLowerCase();
  const name = decoded.split('/').pop() ?? decoded;
  if (!ALLOWED_EXT.includes(ext)) {
    const heic = ['.heic', '.heif'].includes(ext);
    p.push({
      level: 'error',
      message: heic
        ? `"${name}" is a HEIC/HEIF photo (the iPhone default), which browsers cannot show.`
        : `"${name}" is a ${ext || 'file with no extension'} — only JPEG, PNG and WebP images are supported.`,
      fix: heic
        ? 'Export or convert it to JPEG (on iPhone: Settings → Camera → Formats → Most Compatible), then update the file name.'
        : 'Save it as .jpg, .png or .webp and update the file name in the text.',
    });
    return p;
  }
  const found = exactPath(folder, decoded);
  if (!found.exists) {
    if (found.caseMismatch) {
      p.push({
        level: 'error',
        message: `The ${ref.where} writes "${decoded}" but the file is "${found.caseMismatch}". The capital letters differ, and the live site treats them as different files.`,
        fix: 'Rename the file to all lowercase and write the path exactly the same way.',
      });
    } else {
      p.push({
        level: 'error',
        message: `The build can't find the image "${decoded}" used in the ${ref.where}.`,
        fix: `Check the file is in the article's images folder and the name is spelled exactly the same. (Looked in ${relative(process.cwd(), join(folder, decoded))})`,
      });
    }
    return p;
  }
  if (!IMAGE_NAME.test(name)) {
    const why: string[] = [];
    if (/\s/.test(name)) why.push('spaces');
    if (/[A-Z]/.test(name)) why.push('capital letters');
    if (!why.length) why.push('characters other than lowercase letters, numbers and hyphens');
    p.push({
      level: 'error',
      message: `The image file name "${name}" contains ${why.join(' and ')}.`,
      fix: `Rename it using lowercase letters, numbers and hyphens only, e.g. "${name
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}${ext}", and update the text.`,
    });
  }
  const file = join(folder, decoded);
  try {
    const bytes = statSync(file).size;
    const meta = await sharp(file).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w > MAX_SIDE || h > MAX_SIDE || bytes > MAX_BYTES) {
      p.push({
        level: 'warning',
        message: `"${name}" is large (${w}×${h} px, ${(bytes / 1024 / 1024).toFixed(1)} MB). It will be resized for readers, but builds get slower.`,
        fix: `Resize to at most ${MAX_SIDE} px on the longest side and under 5 MB.`,
      });
    }
  } catch {
    p.push({
      level: 'error',
      message: `"${name}" could not be opened as an image. The file may be damaged or not really a ${ext} file.`,
      fix: 'Re-export the image as JPEG or PNG and replace the file.',
    });
  }
  return p;
}
