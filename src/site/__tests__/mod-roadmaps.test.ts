import { describe, expect, it } from 'vitest';

import { Languages } from '../languages.ts';
import { ModRoadmaps, type RoadmapEntry } from '../mod-roadmaps.ts';
import { Translations } from '../translations.ts';
import { LanguageCode } from '../types.ts';

const en = new LanguageCode('en');
const uk = new LanguageCode('uk');

const entry = (
  id: string,
  title: string,
  sidebar: RoadmapEntry['data']['sidebar'] = {},
  draft = false,
): RoadmapEntry => ({ id, data: { title, draft, sidebar } });

const roadmaps = ModRoadmaps.from([
  entry('roadmaps/game-rates', 'What comes next for Game Rates'),
  entry('uk/roadmaps/game-rates', 'Що буде далі в Game Rates'),
  entry('roadmaps/admin-tools', 'What comes next for Admin Tools', { label: 'Admin Tools' }),
  entry('roadmaps/better-altars', 'Better Altars', { order: 1 }),
  entry('roadmaps/probe', 'Probe', {}, true),
  entry('guides/install', 'Install'),
]);

describe('ModRoadmaps', () => {
  it('lists published pages in sidebar order, then by name, in the root language', () => {
    expect(roadmaps.links(en)).toEqual([
      { path: '/roadmaps/better-altars/', label: 'Better Altars' },
      { path: '/roadmaps/admin-tools/', label: 'Admin Tools' },
      { path: '/roadmaps/game-rates/', label: 'What comes next for Game Rates' },
    ]);
  });

  it('labels a link from its translation, else from the root page', () => {
    expect(roadmaps.links(uk).map(({ label }) => label)).toEqual([
      'Better Altars',
      'Admin Tools',
      'Що буде далі в Game Rates',
    ]);
    expect(roadmaps.links(uk)[0]?.path).toBe('/uk/roadmaps/better-altars/');
  });

  it("links a mod's page by the last part of its folder, and none for a draft or a mod without", () => {
    expect(roadmaps.pathOf('admin-tools')).toBe('/roadmaps/admin-tools/');
    expect(roadmaps.pathOf('server/admin-tools')).toBe('/roadmaps/admin-tools/');
    expect(roadmaps.pathOf('probe')).toBeUndefined();
    expect(roadmaps.pathOf('personal-safes')).toBeUndefined();
  });

  it('lists nothing when no page of aims exists', () => {
    expect(ModRoadmaps.from([entry('guides/install', 'Install')]).links(en)).toEqual([]);
  });
});

describe('Languages.of', () => {
  it('takes a site language and falls back to the root for none or an unknown one', () => {
    expect(Languages.site.of('uk').equals(uk)).toBe(true);
    expect(Languages.site.of().equals(Languages.site.root)).toBe(true);
    expect(Languages.site.of('xx').equals(Languages.site.root)).toBe(true);
  });
});

describe('Translations.href', () => {
  it('puts the path in the language under the base address', () => {
    expect(Translations.href('/aims/', uk)).toBe(
      `${import.meta.env.BASE_URL.replace(/\/$/u, '')}/uk/aims/`,
    );
  });
});
