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
  it('names a build from the table key of a released report', () => {
    expect(GameBuildFiles.read('server-1c12-479.toml', report)).toEqual({
      side: 'server',
      name: '1.0 server (26319703)',
      steamBuild: '26319703',
      gameVersion: '1283531',
      off: ['terrain'],
    });
  });

  it('reads a current report, its name from the build key', () => {
    const current = [
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

    expect(GameBuildFiles.read('client-69f0-426.toml', current)).toEqual({
      side: 'client',
      name: 'client, Steam build 26082781, game 1273043, executable 69f0e9573b32c24a8838d3fff550824c/426',
      steamBuild: '26082781',
      gameVersion: '1273043',
      off: ['bases'],
    });
  });

  it('keeps its own class name for logs and errors', () => {
    expect(GameBuildFiles.name).toBe('GameBuildFiles');
  });

  it('falls back to the file name when a report has no name', () => {
    expect(GameBuildFiles.read('server-1c12-479.toml', 'side = "server"').name).toBe(
      'server-1c12-479.toml',
    );
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
