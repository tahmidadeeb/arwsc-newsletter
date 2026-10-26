import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/** Wraps each table in a focusable region that scrolls sideways on small screens. */
export function rehypeTables() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) return;
      const p = parent as Element;
      if (p.type === 'element' && p.properties?.className?.toString().includes('table-scroll')) return;
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-scroll'], role: 'region', ariaLabel: 'Table', tabIndex: 0 },
        children: [node],
      };
    });
  };
}
