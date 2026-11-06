import { describe, expect, it } from 'vitest';

import { GameBuildFiles } from '../game-build-files.ts';

const file = 'server-1c129660cd6efc4f9f0b21652d5ff2bf-479.toml';
const report = [
  'table = "1.0 server (26319703)"',
  'side = "server"',
  'steam_build = 26319703',
  'game_version = 1283531',
  '',
  '[[feature]]',
  'name = "terrain"',
].join('\n');
const table = [
  'name = "1.0 server (26319703)"',
  'side = "server"',
  'steam_build = 26319703',
  '',
  '[symbols]',
  '"a" = 0xffffffffffffffff',
].join('\n');

describe('GameBuildFiles.read', () => {
  it('names a build from its report alone, as for a build with no table', () => {
    expect(GameBuildFiles.read(file, { report })).toEqual({
      side: 'server',
      name: '1.0 server (26319703)',
      steamBuild: '26319703',
      gameVersion: '1283531',
      off: ['terrain'],
    });
  });

  it('names a kept build from its table header when it has no report', () => {
    expect(GameBuildFiles.read(file, { table })).toMatchObject({
      side: 'server',
      name: '1.0 server (26319703)',
      steamBuild: '26319703',
    });
    expect(GameBuildFiles.read(file, { table }).off).toBeUndefined();
  });
});
