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

  it('turns adjacent Rust and Luau blocks into synced tabs and the page into MDX', () => {
    const page = converter.convert(
      'x.md',
      '# X\n\nRead it.\n\n<!-- snippet -->\n```rust,ignore\n# hidden\nlet a = 1;\n```\n\n```lua\nlocal a = 1\n```\n',
    );

    expect(page.mdx).toBe(true);
    expect(page.description).toBe('Read it.');
    expect(page.body).toBe(
      [
        "import { TabItem, Tabs } from '@astrojs/starlight/components';",
        '',
        'Read it.',
        '',
        '<Tabs syncKey="mod-language">',
        '<TabItem label="Rust">',
        '',
        '```rust',
        'let a = 1;',
        '```',
        '',
        '</TabItem>',
        '<TabItem label="Luau">',
        '',
        '```lua',
        'local a = 1',
        '```',
        '',
        '</TabItem>',
        '</Tabs>',
        '',
      ].join('\n'),
    );
  });

  it('leaves blocks apart, of one language or of another kind as they are', () => {
    const text = [
      '```rust',
      'a',
      '```',
      '',
      'Between.',
      '',
      '```luau',
      'b',
      '```',
      '',
      '```luau',
      'c',
      '```',
      '',
      '```toml',
      'd = 1',
      '```',
      '<!-- kept -->',
    ].join('\n');

    expect(converter.switched(text)).toEqual({ body: text, mdx: false });
  });

  it('marks a block for one mod language and leaves one for an unknown language as it is', () => {
    const { body, mdx } = converter.switched(
      '<div data-lang="luau">\n\nOnly Luau.\n\n</div>\n<div data-lang="cobol">\n</div>',
    );

    expect(mdx).toBe(false);
    expect(body).toBe(
      '<div data-only-language="Luau">\n\nOnly Luau.\n\n</div>\n<div data-lang="cobol">\n</div>',
    );
  });

  it('keeps comment-like lines inside code blocks of an MDX page', () => {
    const { body } = converter.switched(
      '```rust\nlet a = 1;\n```\n\n```luau\n<!-- not a comment here -->\n```',
    );

    expect(body).toContain('<!-- not a comment here -->');
  });
});
