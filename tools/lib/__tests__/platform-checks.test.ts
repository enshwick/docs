import { describe, expect, it } from 'vitest';

import type { DeveloperPage } from '../api-map.ts';
import type { PlatformRelease } from '../developer-area.ts';
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

const release = (items?: PlatformRelease['items']): PlatformRelease => ({
  name: 'main',
  ref: 'main',
  api: undefined,
  checked: [],
  lib: undefined,
  abi: undefined,
  errors: undefined,
  items,
});
const stabilityChapter: DeveloperPage = {
  slug: 'dev/stability',
  title: 'Stability',
  body: '| Part | Why |\n| --- | --- |\n| `map` | young |\n',
};

describe('PlatformChecks', () => {
  it('badges the modules from the newest release list', () => {
    const checks = new PlatformChecks(release({ all: ['map'], unstable: ['map'] }), [
      stabilityChapter,
      { slug: 'dev/map', title: 'Map', body: '' },
    ]);

    expect(checks.stability(['map']).badges).toEqual({ 'dev/map': 'unstable' });
  });

  it('fails the stability badges without the chapter at the slug the site links to, or its table', () => {
    const items = { all: ['map'], unstable: [] };
    const moved = { ...stabilityChapter, slug: 'dev/concepts/stability' };
    const empty = { ...stabilityChapter, body: 'No table.' };

    for (const chapter of [moved, empty]) {
      expect(() => new PlatformChecks(release(items), [chapter]).stability(['map'])).toThrow(
        /stability chapter \(dev\/stability\)/u,
      );
    }
  });

  it('fails the stability badges when the newest release has no public path list', () => {
    expect(() => new PlatformChecks(release(), [stabilityChapter]).stability(['map'])).toThrow(
      /no public path list/u,
    );
  });

  it('takes every marked example from the chapter that holds it', () => {
    expect(new PlatformChecks(undefined, pages).snippets()).toEqual(
      new Map([
        ['smallest-mod', 'struct Hello;'],
        ['altar-count', 'struct AltarCount;'],
      ]),
    );
  });

  it('fails the build when the newest version has no ABI module to read the mod id rules from', () => {
    expect(() => new PlatformChecks(undefined, pages).run()).toThrow(
      "no examples of the mod id rules found in the API crate's abi.rs",
    );
  });

  it('fails the build naming the chapter that no longer marks its example', () => {
    expect(() => new PlatformChecks(undefined, pages.slice(0, 1)).snippets()).toThrow(
      "the book's dev/altars chapter marks no altar-count example for the site",
    );
  });
});
