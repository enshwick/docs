import { describe, expect, it } from 'vitest';

import { Area } from '../area.ts';
import { languages } from '../languages.ts';

describe('Area', () => {
  it('puts developer pages in every language in the developer area', () => {
    expect(Area.of('dev/hooks').toString()).toBe('dev');

    for (const code of languages.others) {
      expect(Area.of(`${code}/dev/hooks`).toString()).toBe('dev');
      expect(Area.of(`${code}/guides/install`).toString()).toBe('players');
    }
  });

  it('puts every other page in the player area', () => {
    expect(Area.of('guides/install').toString()).toBe('players');
    expect(Area.of('index').toString()).toBe('players');
  });
});
