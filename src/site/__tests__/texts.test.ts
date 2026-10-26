import { describe, expect, it } from 'vitest';

import { languages } from '../languages.ts';
import { texts } from '../texts.ts';

describe('the site texts', () => {
  it.each(texts.keys)('has %s in every language', (key) => {
    for (const { code } of languages.all) {
      expect(texts.has(key, code), `${key} in ${code}`).toBe(true);
    }
  });

  it('has exactly one root language', () => {
    expect(languages.all.filter((language) => language.isDefault)).toHaveLength(1);
  });
});
