import { describe, expect, it } from 'vitest';

import { DeveloperVersions } from '../developer-versions.ts';

const sources = (...names: string[]): unknown => ({
  platform: {
    repository: 'enshwick/enshwick',
    book: 'book/src',
    versions: names.map((name) => ({ name, ref: name === 'next' ? 'main' : `v${name}` })),
    pageTypes: {},
    modList: 'tools/mods.toml',
  },
});

describe('DeveloperVersions', () => {
  it('serves the newest version at /dev/ and finds no older one there', () => {
    const versions = new DeveloperVersions(sources('next', '1.1', '1.0'));

    expect(versions.olderAt('/dev/')).toBeUndefined();
    expect(versions.olderAt('/dev/hooks/')).toBeUndefined();
    expect(versions.olderAt('/uk/dev/hooks/')).toBeUndefined();
  });

  it('finds an older minor under /dev/<minor>/, in any language', () => {
    const versions = new DeveloperVersions(sources('next', '1.1', '1.0'));

    expect(versions.olderAt('/dev/1.0/hooks/')).toBe('1.0');
    expect(versions.olderAt('/uk/dev/1.1/')).toBe('1.1');
  });

  it('does not take a page whose name starts like a version for an older minor', () => {
    const versions = new DeveloperVersions(sources('next', '1.0'));

    expect(versions.olderAt('/dev/1.0-notes/')).toBeUndefined();
  });

  it('knows no older minor while there is one version', () => {
    expect(new DeveloperVersions(sources('next')).olderAt('/dev/next/')).toBeUndefined();
  });
});
