import { describe, expect, it } from 'vitest';

import { CompatibilityData } from '../compatibility.ts';
import { BuildState, GameBuildRows } from '../game-build-rows.ts';

const oldClient = {
  side: 'client',
  name: '1.0 client (1269579)',
  gameVersion: '1269579',
  off: ['bases', 'voxels'],
};
const client = {
  side: 'client',
  name: '1.0 client (26082781)',
  steamBuild: '26082781',
  gameVersion: '1273043',
  off: [],
};
const server = {
  side: 'server',
  name: '1.0 server (26083076)',
  steamBuild: '26083076',
  gameVersion: '1273043',
  off: [],
};
const newServer = {
  side: 'server',
  name: '1.0 server (26319703)',
  steamBuild: '26319703',
  gameVersion: '1283531',
  off: [],
};
const unreported = { side: 'server', name: '1.0 server (26319703)', gameVersion: '1283531' };

const parse = (builds: readonly object[]): unknown => ({
  platform: [{ name: 'next', builds }],
  mods: [],
});

const rowsOf = (builds: readonly object[]): ReturnType<typeof GameBuildRows.of> => {
  const parsed = CompatibilityData.parse(parse(builds));

  if (!parsed.ok) {
    throw new TypeError(JSON.stringify(parsed.issues));
  }

  return GameBuildRows.of(parsed.value.platform[0]?.builds ?? []);
};

describe('CompatibilityData', () => {
  it('takes builds with and without report data', () => {
    expect(CompatibilityData.parse(parse([oldClient, unreported])).ok).toBe(true);
  });

  it('refuses a build whose features off are not names', () => {
    expect(CompatibilityData.parse(parse([{ ...oldClient, off: [1] }])).ok).toBe(false);
  });
});

describe('GameBuildRows.of', () => {
  it('states a build working fully, partly, or not checked, newest first', () => {
    const rows = rowsOf([oldClient, client, server, newServer]);

    expect(rows.map((row) => [row.side, row.name, row.gameVersion, row.state])).toEqual([
      ['server', '1.0 server (26319703)', '1283531', BuildState.Works],
      ['client', undefined, '1283531', BuildState.Unchecked],
      ['server', '1.0 server (26083076)', '1273043', BuildState.Works],
      ['client', '1.0 client (26082781)', '1273043', BuildState.Works],
      ['client', '1.0 client (1269579)', '1269579', BuildState.Partly],
    ]);
    expect(rows.at(-1)?.off).toEqual(['bases', 'voxels']);
  });

  it('adds no row when every side has the newest game version', () => {
    expect(rowsOf([server, newServer]).map((row) => row.state)).toEqual([
      BuildState.Works,
      BuildState.Works,
    ]);
  });

  it('claims nothing for a build without report data', () => {
    expect(rowsOf([unreported]).map((row) => row.state)).toEqual([BuildState.Unreported]);
  });
});
