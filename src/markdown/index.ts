import { remarkFigures } from './remark-figures';
import { rehypeTables } from './rehype-tables';
import { rehypeFootnotes } from './rehype-footnotes';

/** Shared by astro.config.mjs and the unit tests so both use one pipeline. */
export const markdownOptions = {
  remarkPlugins: [remarkFigures],
  rehypePlugins: [rehypeTables, rehypeFootnotes],
  remarkRehype: {
    footnoteLabel: 'References',
    footnoteBackContent: '↩',
    footnoteBackLabel: (referenceIndex: number) => `Back to reference ${referenceIndex + 1}`,
  },
};
