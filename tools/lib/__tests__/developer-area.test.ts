import { describe, expect, it } from 'vitest';

import { GitRef, RepositoryName } from '../../../src/site/types.ts';
import { ChapterConverter } from '../chapter-converter.ts';
import { DeveloperArea } from '../developer-area.ts';

const area = new DeveloperArea({
  repository: new RepositoryName('enshwick/enshwick'),
  book: 'book/src',
  versions: [{ name: 'next', ref: new GitRef('main') }],
});
const converter = new ChapterConverter((path) => `/dev/${path}/`);

describe('DeveloperArea.pageType', () => {
  it('takes the type the chapter declares', () => {
    const page = converter.convert('faq.md', '<!--\ntype: reference\n-->\n\n# FAQ\n\nText.\n');

    expect(area.pageType('faq.md', page)).toBe('reference');
  });

  it('refuses a chapter that declares no type, naming it', () => {
    const page = converter.convert('hooks.md', '# Hooks\n\nText.\n');

    expect(() => area.pageType('hooks.md', page)).toThrow(/book\/src\/hooks\.md has no page type/u);
  });
});
