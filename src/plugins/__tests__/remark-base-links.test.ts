import { describe, expect, it } from 'vitest';

import { BaseLinks } from '../remark-base-links.ts';

describe('BaseLinks', () => {
  const links = new BaseLinks('/docs');

  it('puts the base in front of root-relative links only', () => {
    expect(links.rewrite('/guides/install/')).toBe('/docs/guides/install/');
    expect(links.rewrite('/docs/guides/install/')).toBe('/docs/guides/install/');
    expect(links.rewrite('//example.com/x')).toBe('//example.com/x');
    expect(links.rewrite('https://example.com/')).toBe('https://example.com/');
    expect(links.rewrite('#anchor')).toBe('#anchor');
  });

  it('rewrites links anywhere in the tree', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'link', url: '/dev/' }] }],
    };

    links.plugin()()(tree);

    expect(tree.children[0]?.children[0]?.url).toBe('/docs/dev/');
  });
});
