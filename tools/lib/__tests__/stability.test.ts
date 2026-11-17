import { describe, expect, it } from 'vitest';

import type { StabilityBadge } from '../../../src/site/stability-badges.ts';
import { Stability } from '../stability.ts';

const page = (slug: string, body = ''): { slug: string; title: string; body: string } => ({
  slug,
  title: slug,
  body,
});
const paths = {
  all: [
    'Load',
    'Load::add_recipe',
    'Load::add_recipe_with',
    'Load::on_damage',
    'actions',
    'actions::Action',
    'content',
    'content::changes',
    'content::changes::Field',
    'content::changes::Field::Slots',
    'content::items',
    'content::knowledge',
    'content::knowledge::Entry',
    'content::recipes',
    'controls',
    'item_data',
    'items',
    'knowledge',
    'map',
    'settings',
    'ui',
    'world',
    'world::Prop',
    'world::Prop::new',
    'world::World',
    'world::World::capture',
    'world::World::players',
  ],
  unstable: [
    'Load::add_recipe',
    'Load::add_recipe_with',
    'actions',
    'actions::Action',
    'content::changes::Field::Slots',
    'content::knowledge',
    'content::knowledge::Entry',
    'items',
    'map',
    'world::Prop',
    'world::Prop::new',
    'world::World::capture',
  ],
};
const modules = ['world', 'map', 'actions', 'ui', 'content', 'items', 'knowledge', 'item_data'];
const levels = (stability: Stability): Record<string, StabilityBadge['level']> =>
  Object.fromEntries(Object.entries(stability.badges).map(([slug, badge]) => [slug, badge.level]));

describe('Stability', () => {
  it('marks a module unstable when the list marks its whole path, and partly so when only some items', () => {
    const pages = [page('dev/world'), page('dev/map'), page('dev/actions'), page('dev/ui')];

    expect(levels(Stability.of(modules, pages, paths))).toEqual({
      'dev/world': 'partial',
      'dev/map': 'unstable',
      'dev/actions': 'unstable',
      'dev/ui': 'stable',
    });
  });

  it('lists a gated type once, not with its members, and a gated method of a stable type', () => {
    const stability = Stability.of(modules, [page('dev/world')], paths);

    expect(stability.badges['dev/world']).toEqual({
      level: 'partial',
      unstable: ['world::Prop', 'world::World::capture'],
    });
  });

  it('gives an item to the deepest page that documents its module, a gated submodule to its parent', () => {
    const pages = [page('dev/content'), page('dev/content/changes'), page('dev/content/knowledge')];

    expect(Stability.of(modules, pages, paths).badges).toEqual({
      'dev/content': { level: 'partial', unstable: ['content::knowledge'] },
      'dev/content/changes': { level: 'partial', unstable: ['content::changes::Field::Slots'] },
      'dev/content/knowledge': { level: 'unstable', unstable: [] },
    });
  });

  it('gives a gated crate root call to each page that names it whole', () => {
    const pages = [
      page('dev/content/recipes', 'Call `Load::add_recipe_with` in init.'),
      page('dev/world', 'See `Load::on_damage` and `Load::add_recipe`.'),
    ];

    expect(Stability.of(modules, pages, paths).badges).toEqual({
      'dev/content/recipes': { level: 'partial', unstable: ['Load::add_recipe_with'] },
      'dev/world': {
        level: 'partial',
        unstable: ['Load::add_recipe', 'world::Prop', 'world::World::capture'],
      },
    });
  });

  it('matches a page to its module by the page name, with hyphens as underscores', () => {
    const pages = [page('dev/item-data'), page('dev/settings'), page('dev/stability')];

    expect(levels(Stability.of(['item_data', 'settings'], pages, paths))).toEqual({
      'dev/item-data': 'stable',
      'dev/settings': 'stable',
    });
  });

  it('reads a page in a folder as the nested module, not the top-level one of the same name', () => {
    const pages = [page('dev/content/items'), page('dev/content/knowledge')];

    expect(levels(Stability.of(['items', 'knowledge', 'content'], pages, paths))).toEqual({
      'dev/content/items': 'stable',
      'dev/content/knowledge': 'unstable',
    });
  });

  it('gives no badge to a module the list lacks, or a listed path that is no crate root module', () => {
    const pages = [page('dev/test'), page('dev/controls')];

    expect(Stability.of(['test'], pages, paths).badges).toEqual({});
  });
});
