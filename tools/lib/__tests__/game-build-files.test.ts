import { describe, expect, it } from 'vitest';

import { type GameBuild, GameBuildFiles } from '../game-build-files.ts';

const report = [
  'table = "1.0 server (26319703)"',
  'side = "server"',
  'steam_build = 26319703',
  'game_version = 1283531',
  '',
  '[[feature]]',
  'name = "terrain"',
].join('\n');

describe('GameBuildFiles.read', () => {
  it('names a build from its report alone, as for a build with no table', () => {
    expect(GameBuildFiles.read('server-1c12-479.toml', report)).toEqual({
      side: 'server',
      name: '1.0 server (26319703)',
      steamBuild: '26319703',
      gameVersion: '1283531',
      off: ['terrain'],
    });
  });
});

const build = (name: string, gameVersion: string, steamBuild: string): GameBuild => ({
  side: 'server',
  name,
  steamBuild,
  gameVersion,
  off: [],
});

describe('GameBuildFiles.ordered', () => {
  it('puts the newest game version last, whatever its file name', () => {
    const builds = [
      build('newest', '1287369', '26430253'),
      build('oldest', '1273043', '26083076'),
      build('later steam build', '1283531', '26319800'),
      build('earlier steam build', '1283531', '26319703'),
    ];

    expect(GameBuildFiles.ordered(builds).map((b) => b.name)).toEqual([
      'oldest',
      'earlier steam build',
      'later steam build',
      'newest',
    ]);
  });
});
