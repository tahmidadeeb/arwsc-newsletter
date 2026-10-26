// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { markdownOptions } from './src/markdown/index.ts';

/**
 * The public address of the site. Set SITE_URL in Vercel's environment
 * variables once a custom domain is connected. Until then Vercel's own
 * production address is used automatically.
 */
function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:4321';
}

export default defineConfig({
  site: siteUrl(),
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/og/') && !page.includes('/404'),
    }),
  ],
  image: { layout: 'constrained', responsiveStyles: false },
  markdown: {
    processor: unified({
      remarkPlugins: markdownOptions.remarkPlugins,
      rehypePlugins: markdownOptions.rehypePlugins,
      remarkRehype: markdownOptions.remarkRehype,
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
