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

  it('ends no sentence at an abbreviation', () => {
    const first = `${'a'.repeat(109)}.`;
    const second = `Another tool, e.g. a mod manager, replaced the file ${'c'.repeat(30)}.`;

    expect(MetaDescription.pack([first, second])).toBe(
      `${first} Another tool, e.g. a mod manager, replaced the…`,
    );
  });

  it('ends a sentence before a capital in any script, so a cut never follows a full stop', () => {
    const whole = `${'а'.repeat(130)}.`;

    expect(
      MetaDescription.pack([`${whole} Мод запускається з версією, для якої його зібрано.`]),
    ).toBe(whole);
  });

  it('keeps a sentence that ends in an ellipsis whole, and never cuts after it', () => {
    const whole = `${'а'.repeat(130)}…`;

    expect(MetaDescription.pack([`${whole} Потім ${words(10)}.`])).toBe(whole);
    expect(MetaDescription.pack(['Enshwick waits… The mod did not start.'])).toBe(
      'Enshwick waits… The mod did not start.',
    );
  });

  it('skips an empty text without a doubled space', () => {
    expect(MetaDescription.pack(['E1: X.', '', 'Fix it.'])).toBe('E1: X. Fix it.');
  });

  it('leaves texts that are short in all as they are', () => {
    expect(MetaDescription.pack(['Short.', 'Also short.'])).toBe('Short. Also short.');
  });
});
