import { describe, expect, it } from 'vitest';

import { ModCard } from '../mod-card.ts';

describe('ModCard.archive', () => {
  it('points at the mod’s own archive in its release', () => {
    expect(
      ModCard.archive({
        repository: 'enshwick/mods',
        release: 'dev',
        package: 'enshwick-game-rates',
      }),
    ).toBe('https://github.com/enshwick/mods/releases/download/dev/enshwick-game-rates.zip');
  });

  it('follows the release tag', () => {
    expect(
      ModCard.archive({
        repository: 'enshwick/mods',
        release: 'enshwick-optimizer-v0.2.0',
        package: 'enshwick-optimizer',
      }),
    ).toBe(
      'https://github.com/enshwick/mods/releases/download/enshwick-optimizer-v0.2.0/enshwick-optimizer.zip',
    );
  });
});

describe('ModCard.source', () => {
  it('points at the mod’s folder of the repository', () => {
    expect(ModCard.source({ repository: 'enshwick/mods', folder: 'game-rates' })).toBe(
      'https://github.com/enshwick/mods/tree/main/game-rates',
    );
  });
});
