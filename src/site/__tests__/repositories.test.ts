import { describe, expect, it } from 'vitest';

import repositoriesData from '../../data/repositories.json' with { type: 'json' };
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

  it('refuses two repositories whose cards would share a name', () => {
    const data = { 'enshwick/.github': { title: 'A' }, 'enshwick/github': { title: 'B' } };

    expect(() => new Repositories(data, texts)).toThrow(Repositories.file);
  });

  it('refuses a description longer than GitHub takes', () => {
    const data = { 'enshwick/mods': { title: 'Enshwick mods', description: 'a'.repeat(351) } };

    expect(() => new Repositories(data, texts)).toThrow(Repositories.file);
  });

  it('refuses a repository whose card the og route would serve under another name', () => {
    for (const name of ['enshwick/enshwick.github.io', 'enshwick/index']) {
      expect(() => new Repositories({ [name]: { title: 'A' } }, texts)).toThrow(Repositories.file);
    }
  });

  it('refuses a title or description with a space at an end or a second line', () => {
    for (const entry of [
      { title: ' A' },
      { title: '' },
      { title: 'A', description: 'Our mods.\r' },
      { title: 'A', description: ' Our mods.' },
    ]) {
      expect(() => new Repositories({ 'enshwick/mods': entry }, texts)).toThrow(Repositories.file);
    }
  });

  it('refuses a site description an About box cannot take', () => {
    const long = new Texts({ 'site.description': { en: 'a'.repeat(351) } }, Languages.site);

    expect(() => new Repositories({ 'enshwick/enshwick': { title: 'Enshwick' } }, long)).toThrow(
      Repositories.file,
    );
  });

  it('puts the cards beside the pages', () => {
    const repositories = new Repositories({ 'enshwick/mods': { title: 'Enshwick mods' } }, texts);

    expect(Object.keys(repositories.beside({ 'guides/install': { title: 'Install' } }))).toEqual([
      'guides/install',
      'github/mods',
    ]);
  });

  it('refuses a page whose id is the path of a repository card', () => {
    const repositories = new Repositories({ 'enshwick/mods': { title: 'Enshwick mods' } }, texts);

    expect(() => repositories.beside({ 'github/mods': { title: 'A page' } })).toThrow(
      Repositories.file,
    );
  });

  it('draws a card for every repository the site lists', () => {
    expect(Object.keys(Repositories.site.cards)).toHaveLength(Object.keys(repositoriesData).length);
  });
});
