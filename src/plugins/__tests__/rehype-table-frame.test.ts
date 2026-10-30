import { describe, expect, it } from 'vitest';

import { TableFrame } from '../rehype-table-frame.ts';

const table = (): { type: string; tagName: string; children: never[] } => ({
  type: 'element',
  tagName: 'table',
  children: [],
});

describe('TableFrame', () => {
  it('puts a table in a focusable frame that scrolls on its own', () => {
    const tree = { type: 'root', children: [table()] };

    new TableFrame().plugin()()(tree);

    expect(tree.children[0]).toEqual({
      type: 'element',
      tagName: 'div',
      properties: { className: ['ew-table'], tabIndex: 0 },
      children: [table()],
    });
  });

  it('frames tables deep in the tree, such as in a list', () => {
    const item = { type: 'element', tagName: 'li', children: [table()] };
    const tree = { type: 'root', children: [{ type: 'element', tagName: 'ul', children: [item] }] };

    new TableFrame().plugin()()(tree);

    expect(item.children[0]).toMatchObject({ tagName: 'div', children: [table()] });
  });

  it('frames a table once, even when the plugin runs twice', () => {
    const tree = { type: 'root', children: [table()] };
    const plugin = new TableFrame().plugin()();

    plugin(tree);
    plugin(tree);

    expect(tree.children[0]).toMatchObject({ tagName: 'div', children: [table()] });
  });
});
