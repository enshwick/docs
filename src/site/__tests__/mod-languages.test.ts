import { describe, expect, it } from 'vitest';

import { ModLanguages } from '../mod-languages.ts';

const languages = new ModLanguages([
  { label: 'Rust', fences: ['rust'] },
  { label: 'Luau', fences: ['luau', 'lua'] },
]);

describe('ModLanguages', () => {
  it('names the language of every fence it lists and nothing for another', () => {
    expect(languages.labelOf('rust')).toBe('Rust');
    expect(languages.labelOf('lua')).toBe('Luau');
    expect(languages.labelOf('toml')).toBeUndefined();
    expect(languages.labelOf('')).toBeUndefined();
  });

  it('falls back to the first language and ranks each by its place in the list', () => {
    expect(languages.fallback).toBe('Rust');
    expect(languages.rank('Luau')).toBe(1);
  });

  it('hides blocks of the other languages for each known choice', () => {
    expect(languages.css.split('\n')).toEqual([
      ':root[data-mod-language="Rust"] [data-only-language]:not([data-only-language="Rust"]) { display: none; }',
      ':root[data-mod-language="Luau"] [data-only-language]:not([data-only-language="Luau"]) { display: none; }',
    ]);
  });

  it('refuses a fence or a label two languages share', () => {
    expect(
      () =>
        new ModLanguages([
          { label: 'Rust', fences: ['rust'] },
          { label: 'Luau', fences: ['rust'] },
        ]),
    ).toThrow(/one language/u);
  });

  it('refuses a label that would break out of a CSS selector', () => {
    expect(() => new ModLanguages([{ label: 'Ru"st', fences: ['rust'] }])).toThrow(TypeError);
  });

  it('reads the site list', () => {
    expect(ModLanguages.site.all.length).toBeGreaterThan(0);
  });
});
