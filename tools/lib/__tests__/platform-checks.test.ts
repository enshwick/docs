import { describe, expect, it } from 'vitest';

import type { DeveloperPage } from '../api-map.ts';
import { PlatformChecks } from '../platform-checks.ts';

const page = (slug: string, name: string, code: string): DeveloperPage => ({
  slug,
  title: slug,
  body: `Text.\n\n<!-- ${name} -->\n\`\`\`rust\n${code}\n\`\`\`\n<!-- /${name} -->\n`,
});

const pages = [
  page('dev/getting-started', 'smallest-mod', 'struct Hello;'),
  page('dev/altars', 'altar-count', 'struct AltarCount;'),
];

describe('PlatformChecks', () => {
  it('takes every marked example from the chapter that holds it', () => {
    expect(new PlatformChecks(undefined, pages).snippets()).toEqual(
      new Map([
        ['smallest-mod', 'struct Hello;'],
        ['altar-count', 'struct AltarCount;'],
      ]),
    );
  });

  it('fails the build naming the chapter that no longer marks its example', () => {
    expect(() => new PlatformChecks(undefined, pages.slice(0, 1)).snippets()).toThrow(
      "the book's dev/altars chapter marks no altar-count example for the site",
    );
  });
});
