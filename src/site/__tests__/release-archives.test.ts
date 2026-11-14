import { describe, expect, it } from 'vitest';

import { Links } from '../links.ts';
import { ReleaseArchives } from '../release-archives.ts';

const archives = new ReleaseArchives({
  'enshwick/enshwick': { 'enshwick.zip': 'v1.0.0-alpha.12' },
  'enshwick/mods': { 'enshwick-game-rates.zip': 'enshwick-game-rates-v0.3.0-alpha.1' },
});

describe('ReleaseArchives.pin', () => {
  it('pins a newest-archive link to the release that carries the archive', () => {
    expect(
      archives.pin('https://github.com/enshwick/enshwick/releases/latest/download/enshwick.zip'),
    ).toBe('https://github.com/enshwick/enshwick/releases/download/v1.0.0-alpha.12/enshwick.zip');
    expect(
      archives.pin(
        'https://github.com/enshwick/mods/releases/latest/download/enshwick-game-rates.zip',
      ),
    ).toBe(
      'https://github.com/enshwick/mods/releases/download/enshwick-game-rates-v0.3.0-alpha.1/enshwick-game-rates.zip',
    );
  });

  it('leaves every other link as written', () => {
    for (const url of [
      '/guides/back-up-saves/',
      'https://github.com/enshwick/enshwick/releases',
      'https://github.com/enshwick/enshwick/releases/download/v1.0.0-alpha.11/enshwick.zip',
    ]) {
      expect(archives.pin(url)).toBe(url);
    }
  });

  it('refuses a newest-archive link that no release carries', () => {
    expect(() =>
      archives.pin('https://github.com/enshwick/mods/releases/latest/download/enshwick-gone.zip'),
    ).toThrow(/enshwick-gone\.zip/u);
  });

  it('leaves a newest-archive link of a repository the site reads no releases of as written', () => {
    const url = 'https://github.com/someone/tool/releases/latest/download/tool.zip';

    expect(archives.pin(url)).toBe(url);
  });

  it('refuses tags that do not read as a repository and archive map', () => {
    expect(() => new ReleaseArchives({ 'not a repository': {} })).toThrow(/release-archives/u);
  });
});

describe('Links', () => {
  it('pins the site download to the newest loader release', () => {
    const links = new Links(
      {
        github: 'https://github.com/enshwick',
        download: 'https://github.com/enshwick/enshwick/releases/latest/download/enshwick.zip',
        license: 'https://github.com/enshwick/enshwick/blob/main/LICENSE',
        issues: 'https://github.com/enshwick/docs/issues/new',
        ideas: 'https://github.com/enshwick/enshwick/issues/new',
        contributing: 'https://github.com/enshwick/.github/blob/main/CONTRIBUTING.md',
        contact: 'contact@enshwick.com',
        security: 'security@enshwick.com',
      },
      archives,
    );

    expect(links.download.toString()).toBe(
      'https://github.com/enshwick/enshwick/releases/download/v1.0.0-alpha.12/enshwick.zip',
    );
  });
});
