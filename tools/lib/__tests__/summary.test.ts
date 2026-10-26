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

  it('gives a chapter with children a group that links the chapter first', () => {
    const sidebar = Summary.parse(book).sidebar((path) => `dev/${path.replace('.md', '')}`);

    expect(sidebar[2]).toEqual({
      label: 'Concepts',
      collapsed: true,
      items: [
        { slug: 'dev/concepts', label: 'Concepts' },
        { slug: 'dev/concepts/threads', label: 'Threads' },
      ],
    });
    expect(sidebar[3]).toEqual({
      label: 'Writing a mod',
      collapsed: true,
      items: [{ slug: 'dev/settings', label: 'Settings' }],
    });
  });
});
