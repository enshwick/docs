import { describe, expect, it } from 'vitest';

import { MetaDescription } from '../meta-description.ts';

const words = (count: number): string => ' word'.repeat(count).trim();

describe('MetaDescription', () => {
  it('counts characters, not UTF-16 units', () => {
    expect(MetaDescription.lengthOf('альфа 🙂')).toBe(7);
  });

  it('fits from 120 to 160 characters', () => {
    expect(MetaDescription.fits('x'.repeat(119))).toBe(false);
    expect(MetaDescription.fits('x'.repeat(120))).toBe(true);
    expect(MetaDescription.fits('x'.repeat(160))).toBe(true);
    expect(MetaDescription.fits('x'.repeat(161))).toBe(false);
  });

  it('keeps as many whole sentences as fit in 160 characters', () => {
    const first = `${'a'.repeat(99)}.`;
    const second = `${'b'.repeat(49)}.`;
    const third = 'Never fits here.';

    expect(MetaDescription.pack([first, `${second} ${third}`])).toBe(`${first} ${second}`);
  });

  it('cuts the next sentence at a word with an ellipsis when the whole ones fall short', () => {
    const packed = MetaDescription.pack(['E2002: A mod did not start.', `${words(40)}, last.`]);

    expect(packed.endsWith('word…')).toBe(true);
    expect(MetaDescription.fits(packed)).toBe(true);
  });

  it('drops a comma before the ellipsis', () => {
    const packed = MetaDescription.pack([`${'a'.repeat(100)}.`, `${'b'.repeat(55)}, ${words(5)}.`]);

    expect(packed).toBe(`${'a'.repeat(100)}. ${'b'.repeat(55)}…`);
  });

  it('leaves texts that are short in all as they are', () => {
    expect(MetaDescription.pack(['Short.', 'Also short.'])).toBe('Short. Also short.');
  });
});
