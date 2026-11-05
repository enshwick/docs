import { describe, expect, it } from 'vitest';

import { LastModified } from '../last-modified.ts';

const log = [
  '',
  '2026-11-04T10:00:00+02:00\n\nsrc/content/docs/guides/install.mdx\nsrc/content/docs/uk/index.mdx\n',
  '2026-10-01T09:00:00+02:00\n\nsrc/content/docs/guides/install.mdx\nsrc/content/docs/index.mdx\nsrc/site/front.ts\n',
].join('\u0000');
const dates = LastModified.fromLog(log);

describe('LastModified', () => {
  it('dates each page by its newest commit', () => {
    expect(dates.of('https://enshwick.com/guides/install/')).toBe('2026-11-04T10:00:00+02:00');
  });

  it('finds the home page of each language by its index file', () => {
    expect(dates.of('https://enshwick.com/')).toBe('2026-10-01T09:00:00+02:00');
    expect(dates.of('https://enshwick.com/uk/')).toBe('2026-11-04T10:00:00+02:00');
  });

  it('finds a page on a site served under a base path', () => {
    expect(dates.of('https://example.com/docs/guides/install/', '/docs')).toBe(
      '2026-11-04T10:00:00+02:00',
    );
  });

  it('finds a page at the address its slug gives it', () => {
    const moved = LastModified.fromLog(
      '\u00002026-11-02T08:00:00+02:00\n\nsrc/content/docs/ai-assistants.md\n',
      new Map([['ai-assistants.md', 'dev/ai-assistants']]),
    );

    expect(moved.of('https://enshwick.com/dev/ai-assistants/')).toBe('2026-11-02T08:00:00+02:00');
    expect(moved.of('https://enshwick.com/ai-assistants/')).toBeUndefined();
  });

  it('dates a generated page by the date its front matter states, over any commit here', () => {
    const generated = LastModified.fromLog(
      log,
      new Map(),
      new Map([
        ['dev/hooks.md', '2026-11-03T00:36:01.000Z'],
        ['guides/install.mdx', '2026-09-01T00:00:00.000Z'],
      ]),
    );

    expect(generated.of('https://enshwick.com/dev/hooks/')).toBe('2026-11-03T00:36:01.000Z');
    expect(generated.of('https://enshwick.com/guides/install/')).toBe('2026-09-01T00:00:00.000Z');
  });

  it('gives no date to a page without a file in this repository', () => {
    expect(dates.of('https://enshwick.com/dev/hooks/')).toBeUndefined();
  });

  it('gives no date to any page when there is no history', () => {
    expect(LastModified.fromLog('').of('https://enshwick.com/')).toBeUndefined();
  });
});
