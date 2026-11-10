import { describe, expect, it } from 'vitest';

import { Languages } from '../../../src/site/languages.ts';
import { GitRef, RepositoryName } from '../../../src/site/types.ts';
import { ModPages, type ModRelease } from '../mod-pages.ts';
import { PlayerPageSource } from '../player-page-source.ts';

const page = `---
id: enshwick.game-rates
name: Game Rates
summary: Building recipes make more for the same cost.
needs: everyone
settings:
  - key: recipe_multiplier
    default: 2
    range: 2 to 100
    meaning: what each building recipe makes
    applies: at-once
---

- Building recipes make twice as much.

## Install

Game Rates needs Enshwick.

## Settings

Change them on the world settings screen.

## Problems

None known.
`;

const shots = 'screenshots:\n  - file: images/menu.webp\n    alt: The rates in the menu';
const version = 'screenshot_game_version: "1.0"';
const withFields = (fields: string): string => page.replace('\n---\n\n', `\n${fields}\n---\n\n`);

const release: ModRelease = {
  slug: 'game-rates',
  name: 'Game Rates',
  repository: new RepositoryName('enshwick/mods'),
  folder: 'game-rates',
  package: 'enshwick-game-rates',
  tag: new GitRef('dev'),
  version: '0.1.0',
  api: '1.0.0',
  needs: 'everyone',
  page: true,
};

describe('PlayerPageSource', () => {
  it('reads numbers in the settings table as text', () => {
    const source = PlayerPageSource.parse('test', page);

    expect(source.data.settings?.[0]?.default.toString()).toBe('2');
    expect(source.body.startsWith('- Building recipes')).toBe(true);
  });

  it('refuses a page with a field the schema does not know', () => {
    expect(() =>
      PlayerPageSource.parse('test', page.replace('needs:', 'color: red\nneeds:')),
    ).toThrow(/test/u);
  });

  it('refuses a summary over 200 characters', () => {
    expect(() =>
      PlayerPageSource.parse(
        'test',
        page.replace(/^summary: .*$/mu, `summary: ${'a'.repeat(201)}`),
      ),
    ).toThrow(/test/u);
  });

  it('refuses a page that does not open with a list of what the mod changes', () => {
    expect(() => PlayerPageSource.parse('test', page.replace('- Building', 'Building'))).toThrow(
      /opens with a list/u,
    );
  });

  it('refuses an opening list of more than five items', () => {
    const long = Array.from({ length: 6 }, (_, index) => `- Change ${index}.`).join('\n');

    expect(() =>
      PlayerPageSource.parse('test', page.replace('- Building recipes make twice as much.', long)),
    ).toThrow(/6 items/u);
  });

  it('counts an item that wraps onto the next line once', () => {
    const wrapped = page.replace(
      '- Building recipes make twice as much.',
      '- Building recipes make\n  twice as much.\n- Nothing else changes.',
    );

    expect(PlayerPageSource.parse('test', wrapped).body.startsWith('- Building')).toBe(true);
  });

  it('refuses a page that never says the mod needs Enshwick', () => {
    expect(() =>
      PlayerPageSource.parse('test', page.replace('Game Rates needs Enshwick.', 'Unpack it.')),
    ).toThrow(/needs Enshwick/u);
  });

  it('refuses screenshots without the game version they show, and a version without screenshots', () => {
    expect(() => PlayerPageSource.parse('test', withFields(shots))).toThrow(
      /screenshot_game_version/u,
    );
    expect(() => PlayerPageSource.parse('test', withFields(version))).toThrow(
      /screenshot_game_version/u,
    );
  });

  it('reads screenshots that name their game version', () => {
    const source = PlayerPageSource.parse('test', withFields(`${shots}\n${version}`));

    expect(source.data.screenshots).toHaveLength(1);
  });

  it('refuses a loop without a poster and a picture with one', () => {
    const loop = 'screenshots:\n  - file: images/build.mp4\n    alt: The camera flies';
    const posteredPicture = `${shots}\n    poster: images/menu.webp`;

    expect(() => PlayerPageSource.parse('test', withFields(`${loop}\n${version}`))).toThrow(
      /poster/u,
    );
    expect(() =>
      PlayerPageSource.parse('test', withFields(`${posteredPicture}\n${version}`)),
    ).toThrow(/poster/u);
  });
});

describe('ModPages.body', () => {
  it('puts the settings table under the settings heading, before the next section', () => {
    const body = ModPages.body(release, Languages.site.root, PlayerPageSource.parse('test', page));
    const table = body.indexOf('| `recipe_multiplier` | `2` | 2 to 100 |');

    expect(table).toBeGreaterThan(body.indexOf('## Settings'));
    expect(table).toBeLessThan(body.indexOf('## Problems'));
  });

  it('shows pictures and loops after the opening list, a loop starting on its poster', () => {
    const media = `screenshots:
  - file: images/menu.webp
    alt: The rates in the menu
  - file: images/craft.mp4
    alt: The "x2" count
    poster: images/craft.webp
${version}`;
    const body = ModPages.body(
      release,
      Languages.site.root,
      PlayerPageSource.parse('test', withFields(media)),
    );
    const picture = body.indexOf('![The rates in the menu](./game-rates/images/menu.webp)');
    const loop = body.indexOf(
      '<video src="/mods/game-rates/images/craft.mp4" poster="/mods/game-rates/images/craft.webp" aria-label="The &quot;x2&quot; count" controls loop muted playsinline preload="none"></video>',
    );

    expect(picture).toBeGreaterThan(body.indexOf('- Building recipes'));
    expect(loop).toBeGreaterThan(picture);
    expect(loop).toBeLessThan(body.indexOf('## Install'));
  });

  it('leaves the facts out of the text, for the mod card to show', () => {
    const body = ModPages.body(release, Languages.site.root, PlayerPageSource.parse('test', page));

    expect(body).not.toContain(':::note');
  });

  it('points links to the old site address at the same page on this site', () => {
    const old =
      `${page}\nThe [guide](https://enshwick.github.io/docs/guides/install/) and ` +
      '[uk](https://enshwick.github.io/docs/uk/guides/install/).\n';
    const body = ModPages.body(release, Languages.site.root, PlayerPageSource.parse('test', old));

    expect(body).toContain('The [guide](/guides/install/) and [uk](/uk/guides/install/).');
    expect(body).not.toContain('enshwick.github.io');
  });
});

describe('ModPages.card', () => {
  it('gives the mod card its id, who needs it, its version and where its source and release are', () => {
    const card = ModPages.card(release, PlayerPageSource.parse('test', page));

    expect(card).toMatchObject({
      id: 'enshwick.game-rates',
      repository: release.repository.toString(),
      folder: release.folder,
      package: release.package,
      release: release.tag?.toString(),
    });
    expect(card.needs).toBeDefined();
  });

  it('gives a mod without a release no release, so its card shows no download', () => {
    const card = ModPages.card(
      { ...release, tag: undefined },
      PlayerPageSource.parse('test', page),
    );

    expect(card).not.toHaveProperty('release');
  });

  it('adds a settings section at the end when the page has none', () => {
    const source = PlayerPageSource.parse('test', page.replace('## Settings', '## Options'));
    const body = ModPages.body(release, Languages.site.root, source);

    expect(body.trimEnd().endsWith('| at once |')).toBe(true);
  });
});
