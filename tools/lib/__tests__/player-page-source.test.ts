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
});

describe('ModPages.body', () => {
  it('puts the settings table under the settings heading, before the next section', () => {
    const body = ModPages.body(release, Languages.site.root, PlayerPageSource.parse('test', page));
    const table = body.indexOf('| `recipe_multiplier` | `2` | 2 to 100 |');

    expect(table).toBeGreaterThan(body.indexOf('## Settings'));
    expect(table).toBeLessThan(body.indexOf('## Problems'));
  });

  it('leaves the facts out of the text, for the mod card to show', () => {
    const body = ModPages.body(release, Languages.site.root, PlayerPageSource.parse('test', page));

    expect(body).not.toContain(':::note');
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
      release: release.tag.toString(),
    });
    expect(card.needs).toBeDefined();
  });

  it('adds a settings section at the end when the page has none', () => {
    const source = PlayerPageSource.parse('test', page.replace('## Settings', '## Options'));
    const body = ModPages.body(release, Languages.site.root, source);

    expect(body.trimEnd().endsWith('| at once |')).toBe(true);
  });
});
