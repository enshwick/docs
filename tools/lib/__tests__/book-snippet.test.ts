import { describe, expect, it } from 'vitest';

import { BookSnippet } from '../book-snippet.ts';
import { LanguageSwitch } from '../language-switch.ts';

const chapter = `Some text.

<!-- smallest-mod -->
\`\`\`rust,standalone_crate
use enshwick::{Load, Mod, Off};

struct AltarCount;
\`\`\`
<!-- /smallest-mod -->

More text.
`;

describe('BookSnippet', () => {
  it('takes the code between the named comments, without its fence', () => {
    expect(new BookSnippet(chapter).named('smallest-mod')).toBe(
      'use enshwick::{Load, Mod, Off};\n\nstruct AltarCount;',
    );
  });

  it('takes the block right after the comment when no closing comment follows', () => {
    expect(
      new BookSnippet(
        '<!-- altar-count -->\n```rust\nstruct A;\n```\n\n```luau\nlocal a\n```\n',
      ).named('altar-count'),
    ).toBe('struct A;');
  });

  it('takes the Rust tab when the language switch has made the blocks tabs', () => {
    const tabs = new LanguageSwitch().apply(
      '<!-- altar-count -->\n```rust\nstruct A;\n```\n\n```luau\nlocal a\n```\n',
    ).body;

    expect(new BookSnippet(tabs).named('altar-count')).toBe('struct A;');
  });

  it('finds nothing when a block other than Rust follows the comment', () => {
    expect(
      new BookSnippet('<!-- altar-count -->\n```luau\nlocal a\n```\n').named('altar-count'),
    ).toBeUndefined();
  });

  it('finds nothing when the chapter has no such comments', () => {
    expect(new BookSnippet(chapter).named('another')).toBeUndefined();
  });

  it('finds nothing when the region holds no code block', () => {
    expect(
      new BookSnippet('<!-- smallest-mod -->\ntext\n<!-- /smallest-mod -->').named('smallest-mod'),
    ).toBeUndefined();
  });
});
