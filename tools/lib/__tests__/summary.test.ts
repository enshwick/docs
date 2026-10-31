import { describe, expect, it } from 'vitest';

import { Summary } from '../summary.ts';

const book = `# Summary

<!-- a comment -->

[Introduction](introduction.md)

- [Getting started](getting-started.md)
- [Concepts](concepts.md)
  - [Threads](concepts/threads.md)

# Writing a mod

- [Settings](settings.md)
`;

describe('Summary', () => {
  it('keeps the book title out of the parts and nests indented chapters', () => {
    const summary = Summary.parse(book);

    expect(summary.parts.map((part) => part.title)).toEqual([undefined, 'Writing a mod']);
    expect(summary.parts[0]?.chapters.map((chapter) => chapter.path)).toEqual([
      'introduction.md',
      'getting-started.md',
      'concepts.md',
    ]);
    expect(summary.parts[0]?.chapters[2]?.children.map((chapter) => chapter.path)).toEqual([
      'concepts/threads.md',
    ]);
  });

  it('lists every chapter once, in reading order', () => {
    const paths = Summary.parse(book).chapters.map(({ chapter }) => chapter.path);

    expect(paths).toEqual([
      'introduction.md',
      'getting-started.md',
      'concepts.md',
      'concepts/threads.md',
      'settings.md',
    ]);
  });

  it('gives a chapter with children a group that opens with the chapter as its overview', () => {
    const sidebar = Summary.parse(book).sidebar((path) => `dev/${path.replace('.md', '')}`);

    expect(sidebar[2]).toEqual({
      label: 'Concepts',
      collapsed: true,
      items: [
        { slug: 'dev/concepts', label: 'Overview' },
        { slug: 'dev/concepts/threads', label: 'Threads' },
      ],
    });
    expect(sidebar[3]).toEqual({
      label: 'Writing a mod',
      collapsed: true,
      items: [{ slug: 'dev/settings', label: 'Settings' }],
    });
  });

  it('flattens a part that holds a chapter of its own name, so no group repeats itself', () => {
    const sidebar = Summary.parse(
      `# Summary

[Introduction](introduction.md)

# Content

- [Content](content.md)
  - [Items](content/items.md)
- [Stats](stats.md)
`,
    ).sidebar((path) => `dev/${path.replace('.md', '')}`);

    expect(sidebar).toEqual([
      { slug: 'dev/introduction', label: 'Introduction' },
      {
        label: 'Content',
        collapsed: true,
        items: [
          { slug: 'dev/content', label: 'Overview' },
          { slug: 'dev/content/items', label: 'Items' },
          { slug: 'dev/stats', label: 'Stats' },
        ],
      },
    ]);
    expect(Summary.repeats(sidebar)).toEqual([]);
  });

  it('names every group whose first item carries its own label', () => {
    const repeating = [
      { label: 'Content', items: [{ label: 'Content', items: [{ slug: 'a', label: 'A' }] }] },
      { label: 'Shipping', items: [{ slug: 'b', label: 'Testing' }] },
      { label: 'Concepts', items: [{ slug: 'c', label: 'Concepts' }] },
    ];

    expect(Summary.repeats(repeating)).toEqual(['Content', 'Concepts']);
  });
});
