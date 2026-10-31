import { describe, expect, it } from 'vitest';

import { ModCard } from '../mod-card.ts';

describe('ModCard.archive', () => {
  it('points at the mod’s own archive in its release', () => {
    expect(ModCard.archive({ repository: 'enshwick/mod-game-rates', release: 'dev' })).toBe(
      'https://github.com/enshwick/mod-game-rates/releases/download/dev/enshwick-game-rates.zip',
    );
  });

  it('follows the release tag', () => {
    expect(ModCard.archive({ repository: 'enshwick/mod-optimizer', release: 'v0.2.0' })).toBe(
      'https://github.com/enshwick/mod-optimizer/releases/download/v0.2.0/enshwick-optimizer.zip',
    );
  });
});
