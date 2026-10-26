import { describe, expect, it } from 'vitest';

import { ChapterConverter } from '../chapter-converter.ts';

const converter = new ChapterConverter((path) => `/dev/${path.replace(/\.md$/u, '')}/`);

describe('ChapterConverter', () => {
  it('takes the title out of the body and the first sentence as the description', () => {
    const page = converter.convert('hooks.md', '# Hooks\n\nA hook runs first. Then the game.\n');

    expect(page.title).toBe('Hooks');
    expect(page.description).toBe('A hook runs first.');
    expect(page.body).toBe('A hook runs first. Then the game.\n');
  });

  it("drops mdBook's hidden lines and fence attributes from Rust examples only", () => {
    const text = [
      '```rust,no_run',
      '# use std::fmt;',
      '#',
      'let x = 1;',
      '## not hidden',
      '#[derive(Debug)]',
      '```',
      '',
      '```toml',
      '# a comment',
      '```',
    ].join('\n');

    expect(ChapterConverter.code(text)).toBe(
      [
        '```rust',
        'let x = 1;',
        '# not hidden',
        '#[derive(Debug)]',
        '```',
        '',
        '```toml',
        '# a comment',
        '```',
      ].join('\n'),
    );
  });

  it('points links between chapters at their pages, relative paths and anchors included', () => {
    const page = converter.convert(
      'content/loot.md',
      '# Loot\n\nSee [inventories](../inventories.md#reads), [items](items.md) and [Rust](https://rust-lang.org/x.md).\n',
    );

    expect(page.body).toContain('[inventories](/dev/inventories/#reads)');
    expect(page.body).toContain('[items](/dev/content/items/)');
    expect(page.body).toContain('[Rust](https://rust-lang.org/x.md)');
  });

  it('refuses a chapter without a level-one heading', () => {
    expect(() => converter.convert('x.md', 'no title')).toThrow(/level-one heading/u);
  });
});
