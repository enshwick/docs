import { describe, expect, it } from 'vitest';

import { Languages } from '../languages.ts';
import { Texts } from '../texts.ts';
import { LanguageCode } from '../types.ts';

describe('the site texts', () => {
  it.each(Texts.site.keys)('has %s in every language', (key) => {
    for (const { code } of Languages.site.all) {
      expect(Texts.site.has(key, code), `${key} in ${code}`).toBe(true);
    }
  });

  it.each(Texts.site.keys)('has the same placeholders in every language of %s', (key) => {
    const names = (code: LanguageCode): string[] =>
      [...Texts.site.get(key, code).matchAll(Texts.placeholder)].map(([whole]) => whole).toSorted();

    for (const { code } of Languages.site.all) {
      expect(names(code), `${key} in ${code}`).toEqual(names(Languages.site.root));
    }
  });

  it('fills each named value in one pass, as written, with numbers in the language’s grouping', () => {
    const texts = new Texts(
      { counted: { en: '{name}: {count} and {other}', uk: '{name}: {count} і {other}' } },
      Languages.site,
    );

    expect(texts.fill('counted', { name: '$&', count: 1234, other: '{name}' })).toBe(
      '$&: 1,234 and {name}',
    );
    expect(
      texts.fill('counted', { name: 'a', count: 1234, other: 'b' }, new LanguageCode('uk')),
    ).toBe('a: 1 234 і b');
  });

  it('refuses to fill a text with a placeholder it is given no value for', () => {
    expect(() => Texts.site.fill('stability.partial.title', {})).toThrow(/\{count\}/u);
  });

  it('has exactly one root language', () => {
    expect(Languages.site.all.filter((language) => language.isDefault)).toHaveLength(1);
  });
});
