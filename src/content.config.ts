import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { articlePatterns, globBase } from './lib/content-dir';
import { toArray } from './lib/format';

const base = globBase();

const themeField = z.union([
  z.string(),
  z.object({
    preset: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    ink: z.string().optional(),
    secondary: z.string().optional(),
  }),
]);

const issues = defineCollection({
  loader: glob({
    base,
    pattern: '*/issue.md',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: ({ image }) =>
    z
      .object({
        issueNumber: z.number().int().positive(),
        title: z.string().min(1),
        monthLabel: z.string().optional(),
        publishDate: z.coerce.date().optional(),
        coverImage: image().optional(),
        coverAlt: z.string().optional(),
        theme: themeField.optional(),
        draft: z.boolean().default(false),
      })
      .superRefine((d, ctx) => {
        if (d.coverImage && !d.coverAlt?.trim()) {
          ctx.addIssue({ code: 'custom', path: ['coverAlt'], message: 'coverAlt (alt text) is required when coverImage is set' });
        }
      }),
});

const articles = defineCollection({
  loader: glob({
    base,
    pattern: articlePatterns(),
    generateId: ({ entry }) => {
      const [issue, folder] = entry.split('/');
      return `${issue}/${folder}`;
    },
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        authors: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).transform(toArray),
        segment: z.string().min(1),
        date: z.coerce.date().optional(),
        summary: z.string().min(1),
        issue: z.union([z.string(), z.date()]).optional(),
        dek: z.string().optional(),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        heroCaption: z.string().optional(),
        heroCredit: z.string().optional(),
        featured: z.boolean().default(false),
        order: z.number().optional(),
        draft: z.boolean().default(false),
      })
      .superRefine((d, ctx) => {
        if (d.heroImage && !d.heroAlt?.trim()) {
          ctx.addIssue({ code: 'custom', path: ['heroAlt'], message: 'heroAlt (alt text) is required when heroImage is set' });
        }
      }),
});

export const collections = { issues, articles };
