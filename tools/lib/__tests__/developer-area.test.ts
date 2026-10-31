import { describe, expect, it } from 'vitest';

import { GitRef, RepositoryName } from '../../../src/site/types.ts';
import { DeveloperArea } from '../developer-area.ts';

const area = new DeveloperArea({
  repository: new RepositoryName('enshwick/enshwick'),
  book: 'book/src',
  versions: [{ name: 'next', ref: new GitRef('main') }],
  pageTypes: { 'faq.md': 'reference', 'concepts/': 'explanation', 'concepts/odd.md': 'how-to' },
});

describe('DeveloperArea.pageType', () => {
  it('takes a chapter its own entry before its folder', () => {
    expect(area.pageType('faq.md')).toBe('reference');
    expect(area.pageType('concepts/threads.md')).toBe('explanation');
    expect(area.pageType('concepts/odd.md')).toBe('how-to');
  });

  it('refuses a chapter no entry declares, naming it', () => {
    expect(() => area.pageType('hooks.md')).toThrow(/book\/src\/hooks\.md has no page type/u);
  });
});
