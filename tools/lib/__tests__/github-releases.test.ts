import { describe, expect, it } from 'vitest';

import { GitHubReleases } from '../github-releases.ts';

const release = (
  tag: string,
  assets: readonly string[],
  { draft = false, prerelease = false } = {},
): object => ({
  tag_name: tag,
  draft,
  prerelease,
  assets: assets.map((name) => ({ name, size: 1 })),
});

describe('GitHubReleases.newestArchives', () => {
  const packages = ['enshwick-area-loot', 'enshwick-game-rates', 'enshwick-optimizer'];

  it('reads each package at the newest regular release that carries its own archive', () => {
    const tags = GitHubReleases.newestArchives(
      'releases',
      [
        release('enshwick-game-rates-v0.2.0', ['enshwick-game-rates.zip']),
        release('enshwick-area-loot-v0.2.0', ['enshwick-area-loot.zip']),
        release('enshwick-game-rates-v0.1.0', ['enshwick-game-rates.zip']),
      ],
      packages,
    );

    expect(Object.fromEntries([...tags].map(([name, tag]) => [name, tag.toString()]))).toEqual({
      'enshwick-area-loot': 'enshwick-area-loot-v0.2.0',
      'enshwick-game-rates': 'enshwick-game-rates-v0.2.0',
    });
  });

  it('prefers an older regular release to a newer prerelease', () => {
    const tags = GitHubReleases.newestArchives(
      'releases',
      [
        release('enshwick-game-rates-v0.3.0-alpha.1', ['enshwick-game-rates.zip'], {
          prerelease: true,
        }),
        release('dev', ['enshwick-area-loot.zip', 'enshwick-game-rates.zip'], { prerelease: true }),
        release('enshwick-game-rates-v0.1.0', ['enshwick-game-rates.zip']),
      ],
      packages,
    );

    expect(tags.get('enshwick-game-rates')?.toString()).toBe('enshwick-game-rates-v0.1.0');
  });

  it('prefers an alpha to the rolling dev build, even when dev is newer', () => {
    const tags = GitHubReleases.newestArchives(
      'releases',
      [
        release('dev', ['enshwick.zip'], { prerelease: true }),
        release('v1.0.0-alpha.13', ['enshwick.zip'], { prerelease: true }),
        release('v1.0.0-alpha.12', ['enshwick.zip'], { prerelease: true }),
      ],
      ['enshwick'],
    );

    expect(tags.get('enshwick')?.toString()).toBe('v1.0.0-alpha.13');
  });

  it('reads a package with neither a regular release nor an alpha at the dev prerelease', () => {
    const tags = GitHubReleases.newestArchives(
      'releases',
      [
        release('dev', ['enshwick-area-loot.zip', 'enshwick-game-rates.zip'], { prerelease: true }),
        release('enshwick-game-rates-v0.1.0', ['enshwick-game-rates.zip']),
      ],
      packages,
    );

    expect(tags.get('enshwick-area-loot')?.toString()).toBe('dev');
  });

  it('leaves out drafts and archives of other names', () => {
    const tags = GitHubReleases.newestArchives(
      'releases',
      [
        release('enshwick-optimizer-v0.2.0', ['enshwick-optimizer.zip'], { draft: true }),
        release('enshwick-optimizer-v0.1.0', ['enshwick-optimizer.tar.gz', 'enshwick.zip']),
      ],
      packages,
    );

    expect(tags.size).toBe(0);
  });

  it('refuses a list that does not read as releases', () => {
    expect(() =>
      GitHubReleases.newestArchives('releases', { message: 'Not Found' }, packages),
    ).toThrow(/releases/u);
  });
});
