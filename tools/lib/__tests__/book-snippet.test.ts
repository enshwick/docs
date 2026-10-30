import { describe, expect, it } from 'vitest';

import { BookSnippet } from '../book-snippet.ts';

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

  it('finds nothing when the chapter has no such comments', () => {
    expect(new BookSnippet(chapter).named('another')).toBeUndefined();
  });

  it('finds nothing when the region holds no code block', () => {
    expect(
      new BookSnippet('<!-- smallest-mod -->\ntext\n<!-- /smallest-mod -->').named('smallest-mod'),
    ).toBeUndefined();
  });
});
