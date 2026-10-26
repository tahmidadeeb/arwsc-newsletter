import type { Image, Paragraph, PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { parseImageTitle } from '../lib/caption';

const span = (className: string, value: string): PhrasingContent =>
  ({
    type: 'emphasis',
    data: { hName: 'span', hProperties: { className: [className] } },
    children: [{ type: 'text', value }],
  }) as PhrasingContent;

/**
 * A paragraph holding only an image becomes <figure class="fig"> with a
 * numbered <figcaption> built from the image title ("Caption | Credit").
 * The image node itself is kept so Astro still optimises it.
 */
export function remarkFigures() {
  return (tree: Root) => {
    let n = 0;
    visit(tree, 'paragraph', (node: Paragraph) => {
      const kids = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
      if (kids.length !== 1 || kids[0].type !== 'image') return;
      const img = kids[0] as Image;
      const { caption, credit, wide } = parseImageTitle(img.title);
      img.title = null;
      n += 1;
      const children: PhrasingContent[] = [img];
      if (caption || credit) {
        const parts: PhrasingContent[] = [span('fig__num', `Fig. ${n}`)];
        if (caption) parts.push({ type: 'text', value: ` ${caption}` });
        if (credit) parts.push({ type: 'text', value: ' ' }, span('fig__credit', credit));
        children.push({
          type: 'emphasis',
          data: { hName: 'figcaption' },
          children: parts,
        } as PhrasingContent);
      }
      node.children = children;
      node.data = {
        ...(node.data ?? {}),
        hName: 'figure',
        hProperties: { className: wide ? ['fig', 'fig--wide'] : ['fig'] },
      };
    });
  };
}
