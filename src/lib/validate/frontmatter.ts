import { parse } from 'yaml';

export type Frontmatter = Record<string, unknown>;

export type ParseResult =
  | { ok: true; data: Frontmatter; body: string }
  | { ok: false; message: string; fix: string };

/** Strip a byte-order mark and Windows line endings. */
export const normalise = (s: string) => s.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

const UNQUOTED_HASH = /^([A-Za-z]+):[ \t]+(?!["'|>#])([^\n]*?[ \t]#[^\n]*)$/m;
const FIELDS_THAT_NEED_QUOTES = /^([A-Za-z]+):[ \t]+(?!["'|>])([^\n]*?:[ \t][^\n]*|[^\n]*:|[^\n]*[ \t]#[^\n]*)$/m;

export function parseFrontmatter(raw: string): ParseResult {
  const text = normalise(raw);
  if (!text.startsWith('---\n')) {
    return {
      ok: false,
      message: 'The file does not start with a "---" header block.',
      fix: 'The first line must be exactly --- , followed by the fields (title:, authors: …), then another --- line, then the article text.',
    };
  }
  const end = text.indexOf('\n---', 4);
  if (end < 0 || !/^\n---[ \t]*(\n|$)/.test(text.slice(end))) {
    return {
      ok: false,
      message: 'The "---" header block is never closed.',
      fix: 'Add a line containing only --- after the last field, before the article text.',
    };
  }
  const yamlText = text.slice(4, end);
  const body = text.slice(end).replace(/^\n---[ \t]*\n?/, '');
  try {
    const data = parse(yamlText) ?? {};
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error('not a list of fields');
    // YAML treats " #" as the start of a comment and silently drops the rest
    // of the line, so an unquoted "We are #1" would publish as "We are".
    const hash = UNQUOTED_HASH.exec(yamlText);
    if (hash) {
      const [, field, value] = hash;
      return {
        ok: false,
        message: `The ${field} contains " #" without quotes, so everything after the # would be cut off.`,
        fix: `put the ${field} in quotes, like this: ${field}: "${value.trim().replace(/"/g, '“')}"`,
      };
    }
    return { ok: true, data: data as Frontmatter, body };
  } catch (e) {
    const m = FIELDS_THAT_NEED_QUOTES.exec(yamlText);
    if (m) {
      const [, field, value] = m;
      return {
        ok: false,
        message: `The ${field} contains a colon (:) or a # without quotes, which breaks the header.`,
        fix: `put the ${field} in quotes, like this: ${field}: "${value.replace(/"/g, '“')}"`,
      };
    }
    const first = String((e as Error).message).split('\n')[0];
    return {
      ok: false,
      message: `The header block could not be read (${first}).`,
      fix: 'Check that every line looks like "field: value", that lists use "  - " under the field, and that text containing : or # is in double quotes.',
    };
  }
}
