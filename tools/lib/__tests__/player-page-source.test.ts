import { describe, expect, it } from 'vitest';

import { languages } from '../../../src/site/languages.ts';
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

## Settings

Change them on the world settings screen.

## Problems

None known.
`;

const release: ModRelease = {
  slug: 'game-rates',
  name: 'Game Rates',
  repository: new RepositoryName('enshwick/mod-game-rates'),
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
});

describe('ModPages.body', () => {
  it('puts the settings table under the settings heading, before the next section', () => {
    const body = ModPages.body(release, languages.root, PlayerPageSource.parse('test', page));
    const table = body.indexOf('| `recipe_multiplier` | `2` | 2 to 100 |');

    expect(table).toBeGreaterThan(body.indexOf('## Settings'));
    expect(table).toBeLessThan(body.indexOf('## Problems'));
  });

  it('leaves the facts out of the text, for the mod card to show', () => {
    const body = ModPages.body(release, languages.root, PlayerPageSource.parse('test', page));

    expect(body).not.toContain(':::note');
  });
});

describe('ModPages.card', () => {
  it('gives the mod card its id, who needs it, its version and where its release is', () => {
    const card = ModPages.card(release, PlayerPageSource.parse('test', page));

    expect(card).toMatchObject({
      id: 'enshwick.game-rates',
      repository: release.repository.toString(),
      release: release.tag.toString(),
    });
    expect(card.needs).toBeDefined();
  });

  it('adds a settings section at the end when the page has none', () => {
    const source = PlayerPageSource.parse('test', page.replace('## Settings', '## Options'));
    const body = ModPages.body(release, languages.root, source);

    expect(body.trimEnd().endsWith('| at once |')).toBe(true);
  });
});
