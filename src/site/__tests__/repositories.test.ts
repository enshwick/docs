import { describe, expect, it } from 'vitest';

import { Languages } from '../languages.ts';
import { Repositories } from '../repositories.ts';
import { Texts } from '../texts.ts';

const texts = new Texts({ 'site.description': { en: 'The site in one line.' } }, Languages.site);

describe('the repositories', () => {
  it('gives a repository without a description the site’s own', () => {
    const repositories = new Repositories({ 'enshwick/enshwick': { title: 'Enshwick' } }, texts);

    expect(repositories.cards).toEqual({
      'github/enshwick': { title: 'Enshwick', description: 'The site in one line.' },
    });
  });

  it('keeps a repository’s own description', () => {
    const repositories = new Repositories(
      { 'enshwick/mods': { title: 'Enshwick mods', description: 'Our mods.' } },
      texts,
    );

    expect(repositories.cards['github/mods']?.description).toBe('Our mods.');
  });

  it('names a card without the dot a repository’s name opens with', () => {
    const repositories = new Repositories({ 'enshwick/.github': { title: 'On GitHub' } }, texts);

    expect(Object.keys(repositories.cards)).toEqual(['github/github']);
  });

  it('refuses a description longer than GitHub takes', () => {
    const data = { 'enshwick/mods': { title: 'Enshwick mods', description: 'a'.repeat(351) } };

    expect(() => new Repositories(data, texts)).toThrow(Repositories.file);
  });

  it('has a card for every repository of the project', () => {
    expect(Object.keys(Repositories.site.cards)).toEqual([
      'github/enshwick',
      'github/mods',
      'github/docs',
      'github/vortex-extension',
      'github/github',
    ]);
  });
});
