import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

const classes = (el: Element): string[] => {
  const c: unknown = el.properties?.className;
  if (Array.isArray(c)) return c.map(String);
  return typeof c === 'string' ? c.split(/\s+/) : [];
};

/** Makes the GFM footnotes section a visible "References" list. */
export function rehypeFootnotes() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'section' || !('dataFootnotes' in (node.properties ?? {}))) return;
      node.properties.className = [...new Set([...classes(node), 'footnotes', 'references'])];
      for (const child of node.children) {
        if (child.type === 'element' && child.tagName === 'h2') {
          child.properties.className = classes(child).filter((c) => c !== 'sr-only');
          if (!child.properties.className.length) delete child.properties.className;
        }
      }
    });
  };
}
