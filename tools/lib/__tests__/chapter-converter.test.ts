import { describe, expect, it } from 'vitest';

import { ChapterConverter } from '../chapter-converter.ts';
import { LanguageSwitch } from '../language-switch.ts';
import { MdxBody } from '../mdx-body.ts';

const converter = new ChapterConverter((path) => `/dev/${path.replace(/\.md$/u, '')}/`);
const languageSwitch = new LanguageSwitch();

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

  it('turns adjacent Rust and Luau blocks into synced tabs in the list order', () => {
    const page = converter.convert(
      'x.md',
      '# X\n\nRead it.\n\n<!-- snippet -->\n```lua\nlocal a = 1\n```\n\n```rust,ignore\n# hidden\nlet a = 1;\n```\n',
    );

    expect(page.mdx).toBe(true);
    expect(page.description).toBe('Read it.');
    expect(page.body).toBe(
      [
        'Read it.',
        '',
        '<!-- snippet -->',
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

  it('ends a run at a block of another kind or a language already in it', () => {
    const { body } = languageSwitch.apply(
      [
        '```rust',
        'a',
        '```',
        '```luau',
        'b',
        '```',
        '```toml',
        'c',
        '```',
        '```rust',
        'd',
        '```',
        '```luau',
        'e',
        '```',
      ].join('\n'),
    );

    expect(body.match(/<Tabs /gu)).toHaveLength(2);
    expect(body).toContain('</Tabs>\n```toml\nc\n```\n<Tabs ');
  });

  it('leaves blocks apart, of one language, of another kind or in a list as they are', () => {
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
      '- item',
      '  ```rust',
      '  e',
      '  ```',
      '  ```luau',
      '  f',
      '  ```',
      '<div data-lang="luau">',
      '<!-- kept -->',
    ].join('\n');

    expect(languageSwitch.apply(text)).toEqual({ body: text, mdx: false });
  });

  it('marks a block for one mod language only on a page with tabs', () => {
    const { body } = languageSwitch.apply(
      '```rust\na\n```\n```luau\nb\n```\n<div data-lang="luau">\n\nOnly Luau.\n\n</div>\n<div data-lang="cobol">\n</div>',
    );

    expect(body).toContain('<div data-only-language="Luau">\n\nOnly Luau.\n\n</div>');
    expect(body).toContain('<div data-lang="cobol">');
  });

  it('makes a body MDX: comments out, braces escaped and autolinks as links, code untouched', () => {
    const body = [
      'Text <!-- inline --> stays.',
      '<!--',
      'a comment over lines',
      '-->',
      'A {brace} and `{code}` and <https://example.com>.',
      '```luau',
      '<!-- code --> { }',
      '```',
    ].join('\n');

    expect(MdxBody.of(body)).toBe(
      [
        "import { TabItem, Tabs } from '@astrojs/starlight/components';",
        '',
        'Text  stays.',
        'A \\{brace\\} and `{code}` and [https://example.com](https://example.com).',
        '```luau',
        '<!-- code --> { }',
        '```',
      ].join('\n'),
    );
  });
});
