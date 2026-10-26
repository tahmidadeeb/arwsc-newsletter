/**
 * Loaders for the editable YAML files in src/data. Each one validates its
 * file and throws a plain-language error naming the file and the problem.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro/zod';
import type { Segment, Treatment } from './types';
import { TREATMENTS } from './types';
import type { ThemeInput } from './theme';

export const DEFAULT_DATA_DIR = 'src/data';

function readYaml(dir: string, name: string): unknown {
  const file = join(dir, name);
  if (!existsSync(file)) throw new Error(`${file} is missing.`);
  try {
    return parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    throw new Error(`${file} could not be read: ${(e as Error).message.split('\n')[0]}`);
  }
}

function explain(file: string, err: z.ZodError): Error {
  const lines = err.issues.map((i) => {
    const where = i.path.length ? i.path.map((p) => (typeof p === 'number' ? `entry ${p + 1}` : String(p))).join(' → ') : 'file';
    return `  • ${where}: ${i.message}`;
  });
  return new Error(`${file} has a problem:\n${lines.join('\n')}`);
}

const segmentSchema = z.object({
  key: z
    .string({ error: 'needs a "key"' })
    .regex(/^[a-z0-9-]+$/, 'key must be lowercase letters, numbers or hyphens'),
  label: z.string({ error: 'needs a "label"' }).min(1),
  order: z.number({ error: 'needs a number "order"' }),
  treatment: z.string().optional(),
  description: z.string().optional(),
});

export function readSegments(dir = DEFAULT_DATA_DIR): { segments: Segment[]; warnings: string[] } {
  const file = join(dir, 'segments.yaml');
  const raw = readYaml(dir, 'segments.yaml') ?? [];
  const r = z.array(segmentSchema).safeParse(raw);
  if (!r.success) throw explain(file, r.error);
  const warnings: string[] = [];
  const seen = new Set<string>();
  const segments = r.data.map((s) => {
    if (seen.has(s.key)) throw new Error(`${file}: duplicate segment key "${s.key}". Each key must be unique.`);
    seen.add(s.key);
    let treatment: Treatment = 'standard';
    if (s.treatment !== undefined) {
      if ((TREATMENTS as readonly string[]).includes(s.treatment)) treatment = s.treatment as Treatment;
      else
        warnings.push(
          `${file}: segment "${s.key}" has treatment "${s.treatment}", which is not one of ` +
            `${TREATMENTS.join(', ')}. Using "standard".`,
        );
    }
    return { key: s.key, label: s.label, order: s.order, treatment, ...(s.description ? { description: s.description } : {}) };
  });
  segments.sort((a, b) => a.order - b.order);
  return { segments, warnings };
}

export const loadSegments = (dir = DEFAULT_DATA_DIR): Segment[] => readSegments(dir).segments;

const themeSchema = z.object({
  accent: z.string().optional(),
  background: z.string().optional(),
  ink: z.string().optional(),
  secondary: z.string().optional(),
});

export function loadThemes(dir = DEFAULT_DATA_DIR): Record<string, ThemeInput> {
  const r = z.record(z.string(), themeSchema).safeParse(readYaml(dir, 'themes.yaml') ?? {});
  if (!r.success) throw explain(join(dir, 'themes.yaml'), r.error);
  return r.data;
}

const teamSchema = z.array(
  z.object({
    name: z.string({ error: 'needs a "name"' }).min(1),
    role: z.string({ error: 'needs a "role"' }).min(1),
    photo: z.string().optional(),
    bio: z.string().optional(),
  }),
);
export type TeamMember = z.infer<typeof teamSchema>[number];

export function loadTeam(dir = DEFAULT_DATA_DIR): TeamMember[] {
  const r = teamSchema.safeParse(readYaml(dir, 'team.yaml') ?? []);
  if (!r.success) throw explain(join(dir, 'team.yaml'), r.error);
  return r.data;
}

/** Defaults for reader-facing text; site.yaml overrides any of them. */
const TEXT = {
  teamIntro: 'The people who commission, edit and publish each issue.',
  contactNote: 'Pitches, letters, corrections and questions are all welcome.',
  signupHeading: 'Every issue, in your inbox',
  signupFooterHeading: 'Get each issue by email',
  signupText: 'One email a month when a new issue is published. Nothing else.',
  signupSoon: 'Email delivery is coming. For now, read every issue here on the site.',
  signupPrivacy: 'We only use your email to send the newsletter. Unsubscribe any time.',
  signupSuccess: 'Almost there — check your inbox and click the link to confirm your subscription.',
  notFound:
    'The page you were looking for has been moved, renamed, or never existed. Try the latest issue or browse the archive.',
};

const siteSchema = z.object({
  clubName: z.string(),
  shortName: z.string(),
  tagline: z.string().default(''),
  contactEmail: z.string().default('PLACEHOLDER'),
  social: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .nullable()
    .default([])
    .transform((v) => v ?? []),
  about: z
    .object({ intro: z.string().default(''), body: z.array(z.string()).default([]) })
    .default({ intro: '', body: [] }),
  join: z.object({ text: z.string().default('') }).default({ text: '' }),
  team: z
    .object({ intro: z.string().default(TEXT.teamIntro) })
    .default({ intro: TEXT.teamIntro }),
  contact: z
    .object({ note: z.string().default(TEXT.contactNote) })
    .default({ note: TEXT.contactNote }),
  signup: z
    .object({
      heading: z.string().default(TEXT.signupHeading),
      footerHeading: z.string().default(TEXT.signupFooterHeading),
      text: z.string().default(TEXT.signupText),
      comingSoon: z.string().default(TEXT.signupSoon),
      privacy: z.string().default(TEXT.signupPrivacy),
      success: z.string().default(TEXT.signupSuccess),
    })
    .prefault({}),
  notFound: z
    .object({ text: z.string().default(TEXT.notFound) })
    .default({ text: TEXT.notFound }),
});
export type Site = z.infer<typeof siteSchema>;

export function loadSite(dir = DEFAULT_DATA_DIR): Site {
  const r = siteSchema.safeParse(readYaml(dir, 'site.yaml') ?? {});
  if (!r.success) throw explain(join(dir, 'site.yaml'), r.error);
  return r.data;
}

export const isPlaceholder = (v: string | undefined | null) => !v || /PLACEHOLDER/.test(v);
