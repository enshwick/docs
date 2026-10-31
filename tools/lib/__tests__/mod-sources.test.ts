import { describe, expect, it } from 'vitest';

import { ModSources } from '../mod-sources.ts';

const workspace = `
[workspace]
members = ["area-loot", "game-rates", "devtools/*"]

[workspace.package]
version = "0.3.0"

[workspace.dependencies]
enshwick = { git = "https://github.com/enshwick/enshwick", rev = "6b948b0", version = "1.0.0-alpha.11" }
`;

const release = (tag: string, assets: readonly string[], draft = false): object => ({
  tag_name: tag,
  draft,
  prerelease: false,
  assets: assets.map((name) => ({ name, size: 1 })),
});

describe('ModSources.workspaceMembers', () => {
  it('takes the member folders of the workspace manifest, globs as written', () => {
    expect(ModSources.workspaceMembers('Cargo.toml', workspace)).toEqual([
      'area-loot',
      'game-rates',
      'devtools/*',
    ]);
  });

  it('refuses a missing manifest or one without members', () => {
    expect(() => ModSources.workspaceMembers('Cargo.toml')).toThrow(/Cargo\.toml/u);
    expect(() => ModSources.workspaceMembers('Cargo.toml', '[workspace]\nmembers = []\n')).toThrow(
      /Cargo\.toml/u,
    );
  });
});

describe('ModSources.newestArchives', () => {
  const packages = ['enshwick-area-loot', 'enshwick-game-rates', 'enshwick-optimizer'];

  it('reads each package at the newest release that carries its own archive', () => {
    const tags = ModSources.newestArchives(
      'releases',
      [
        release('enshwick-game-rates-v0.2.0', ['enshwick-game-rates.zip']),
        release('dev', ['enshwick-area-loot.zip', 'enshwick-game-rates.zip']),
        release('enshwick-area-loot-v0.1.0', ['enshwick-area-loot.zip']),
      ],
      packages,
    );

    expect(Object.fromEntries([...tags].map(([name, tag]) => [name, tag.toString()]))).toEqual({
      'enshwick-area-loot': 'dev',
      'enshwick-game-rates': 'enshwick-game-rates-v0.2.0',
    });
  });

  it('leaves out drafts and archives of other names', () => {
    const tags = ModSources.newestArchives(
      'releases',
      [
        release('enshwick-optimizer-v0.2.0', ['enshwick-optimizer.zip'], true),
        release('enshwick-optimizer-v0.1.0', ['enshwick-optimizer.tar.gz', 'enshwick.zip']),
      ],
      packages,
    );

    expect(tags.size).toBe(0);
  });

  it('refuses a list that does not read as releases', () => {
    expect(() => ModSources.newestArchives('releases', { message: 'Not Found' }, packages)).toThrow(
      /releases/u,
    );
  });
});

describe('ModSources.manifestFacts', () => {
  it('reads the version and the API version from the mod manifest', () => {
    const manifest = '[package]\nversion = "0.1.0"\n\n[dependencies]\nenshwick = "1.0.0"\n';

    expect(ModSources.manifestFacts(manifest, workspace)).toEqual({
      version: '0.1.0',
      api: '1.0.0',
    });
  });

  it('takes what the mod inherits from the workspace manifest', () => {
    const manifest =
      '[package]\nversion.workspace = true\n\n[dependencies]\nenshwick = { workspace = true, features = ["unstable"] }\n';

    expect(ModSources.manifestFacts(manifest, workspace)).toEqual({
      version: '0.3.0',
      api: '1.0.0-alpha.11',
    });
  });

  it('knows nothing of a mod without a manifest', () => {
    expect(ModSources.manifestFacts(undefined, workspace)).toEqual({
      version: undefined,
      api: undefined,
    });
  });
});
