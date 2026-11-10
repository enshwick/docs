import { describe, expect, it } from 'vitest';

import { type GameBuild, GameBuildFiles } from '../game-build-files.ts';

describe('GameBuildFiles.read', () => {
  it('reads a report without its build label, which players do not need', () => {
    const report = [
      'build = "client, Steam build 26082781, game 1273043, executable 69f0e9573b32c24a8838d3fff550824c/426"',
      'side = "client"',
      'steam_build = 26082781',
      'game_version = 1273043',
      'entries = 802',
      'routed = 799',
      'missing = ["bases.base_ids"]',
      'unread = ["attribute.fuel_max_slot"]',
      '',
      '[[feature]]',
      'name = "bases"',
      'state = "partly"',
      'missing = ["bases.base_ids"]',
    ].join('\n');

    expect(GameBuildFiles.read('client-69f0-426.toml', report)).toEqual({
      side: 'client',
      steamBuild: '26082781',
      gameVersion: '1273043',
      off: ['bases'],
    });
  });

  it('keeps its own class name for logs and errors', () => {
    expect(GameBuildFiles.name).toBe('GameBuildFiles');
  });
});

const build = (gameVersion: string, steamBuild: string, side = 'server'): GameBuild => ({
  side,
  steamBuild,
  gameVersion,
  off: [],
});

describe('GameBuildFiles.ordered', () => {
  it('puts the newest game version last, then the later Steam build', () => {
    const builds = [
      build('1287369', '26430253'),
      build('1273043', '26083076'),
      build('1283531', '26319800'),
      build('1283531', '26319703'),
    ];

    expect(GameBuildFiles.ordered(builds).map((b) => b.steamBuild)).toEqual([
      '26083076',
      '26319703',
      '26319800',
      '26430253',
    ]);
  });
});

describe('GameBuildFiles.newest', () => {
  it('keeps only the newest build of each side, client first', () => {
    const builds = [
      build('1287369', '26430253'),
      build('1287369', '26430625', 'client'),
      build('1273043', '26083076'),
      build('1273043', '26082781', 'client'),
    ];

    expect(GameBuildFiles.newest(builds).map((b) => [b.side, b.steamBuild])).toEqual([
      ['client', '26430625'],
      ['server', '26430253'],
    ]);
  });

  it('has nothing for no reports', () => {
    expect(GameBuildFiles.newest([])).toEqual([]);
  });
});
