import { describe, expect, it } from 'vitest';

import { ReleaseArchives } from '../../site/release-archives.ts';
import { ReleaseLinks } from '../remark-release-links.ts';

describe('ReleaseLinks', () => {
  const links = new ReleaseLinks(
    new ReleaseArchives({ 'enshwick/enshwick': { 'enshwick.zip': 'v1.0.0-alpha.12' } }),
  );
  const latest = 'https://github.com/enshwick/enshwick/releases/latest/download/enshwick.zip';
  const pinned =
    'https://github.com/enshwick/enshwick/releases/download/v1.0.0-alpha.12/enshwick.zip';

  it('pins links and link definitions anywhere in the tree', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'link', url: latest }] },
        { type: 'definition', url: latest },
        { type: 'code', url: latest },
      ],
    };

    links.plugin()()(tree);

    expect(tree.children[0]?.children?.[0]?.url).toBe(pinned);
    expect(tree.children[1]?.url).toBe(pinned);
    expect(tree.children[2]?.url).toBe(latest);
  });
});
