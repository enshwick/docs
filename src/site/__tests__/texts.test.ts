import { describe, expect, it } from 'vitest';

import { Languages } from '../languages.ts';
import { Texts } from '../texts.ts';

describe('the site texts', () => {
  it.each(Texts.site.keys)('has %s in every language', (key) => {
    for (const { code } of Languages.site.all) {
      expect(Texts.site.has(key, code), `${key} in ${code}`).toBe(true);
    }
  });

  it('has exactly one root language', () => {
    expect(Languages.site.all.filter((language) => language.isDefault)).toHaveLength(1);
  });
});
