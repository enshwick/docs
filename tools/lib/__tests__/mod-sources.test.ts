import { posix, win32 } from 'node:path';

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

describe('ModSources.folder', () => {
  it('gives the folder of a scanned path with forward slashes on every platform', () => {
    expect(ModSources.folder('devtools\\enshwick-probe\\Cargo.toml', win32.sep)).toBe(
      'devtools/enshwick-probe',
    );
    expect(ModSources.folder('area-loot/Cargo.toml', posix.sep)).toBe('area-loot');
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
