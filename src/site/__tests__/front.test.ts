import { describe, expect, it } from 'vitest';

import { frontData } from '../front.ts';

const compat = {
  platform: [
    {
      name: 'next',
      api: '1.0.0-alpha.11',
      builds: [
        { side: 'client', name: '1.0 client (1269579)' },
        { side: 'client', name: '1.0 client (26082781)', steamBuild: '26082781' },
        { side: 'server', name: '1.0 server (26083076)', steamBuild: '26083076' },
      ],
    },
  ],
  mods: [
    {
      slug: 'area-loot',
      name: 'Area loot',
      repository: 'enshwick/mod-area-loot',
      tag: 'dev',
      needs: 'server',
      page: true,
    },
    {
      slug: 'build-camera',
      name: 'Build camera',
      repository: 'enshwick/mod-build-camera',
      tag: 'dev',
      needs: 'everyone',
      page: true,
    },
  ],
};

const lines = {
  'area-loot': {
    side: 'server',
    summary: { en: 'Loot the whole area at once.', uk: 'Лут з усієї ділянки одразу.' },
  },
  'build-camera': { side: 'everyone', summary: { en: 'Fly the camera while you build.' } },
};

const en = 'en';
const uk = 'uk';

describe('frontData', () => {
  it('takes the newest platform release as the version', () => {
    expect(frontData(compat, lines, en).version).toBe('1.0.0-alpha.11');
  });

  it('lists the newest Steam build of each side', () => {
    expect(frontData(compat, lines, en).gameBuilds).toEqual([
      { side: 'client', name: '1.0 client (26082781)' },
      { side: 'server', name: '1.0 server (26083076)' },
    ]);
  });

  it('builds a card per mod with its line in the asked language and English as fallback', () => {
    const cards = frontData(compat, lines, uk).mods;
    expect(cards.map((card) => [card.name, card.line, card.needs])).toEqual([
      ['Area loot', 'Лут з усієї ділянки одразу.', 'server'],
      ['Build camera', 'Fly the camera while you build.', 'everyone'],
    ]);
  });

  it('omits the version when there is no platform release', () => {
    const data = frontData({ ...compat, platform: [] }, lines, en);
    expect(data.version).toBeUndefined();
    expect(data.gameBuilds).toEqual([]);
  });

  it('throws naming mods.json when a mod has no line', () => {
    expect(() => frontData(compat, { 'area-loot': lines['area-loot'] }, en)).toThrow(
      /mods\.json.*build-camera/u,
    );
  });
});

describe('frontData mod sides', () => {
  it('throws naming mods.json when a side disagrees with the mod page', () => {
    const wrong = { ...lines, 'area-loot': { ...lines['area-loot'], side: 'client' } };

    expect(() => frontData(compat, wrong, en)).toThrow(/mods\.json.*area-loot.*server/u);
  });

  it('carries what the mod card shows: version, repository and release', () => {
    const [card] = frontData(compat, lines, en).mods;

    expect(card).toMatchObject({ repository: 'enshwick/mod-area-loot', tag: 'dev' });
  });
});

describe('frontData mod pages', () => {
  it('marks a mod without a page so its card does not link', () => {
    const noPage = { ...compat, mods: compat.mods.map((mod) => ({ ...mod, page: false })) };
    expect(frontData(noPage, lines, 'en').mods.every((card) => !card.page)).toBe(true);
    expect(frontData(compat, lines, 'en').mods.every((card) => card.page)).toBe(true);
  });
});
