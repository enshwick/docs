import { describe, expect, it } from 'vitest';

import { Stability, type StabilityLevel } from '../stability.ts';

const page = (slug: string): { slug: string; title: string; body: string } => ({
  slug,
  title: slug,
  body: '',
});
const paths = {
  all: [
    'actions',
    'actions::Action',
    'content',
    'content::items',
    'content::knowledge',
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
  ],
  unstable: [
    'actions',
    'actions::Action',
    'content::knowledge',
    'items',
    'map',
    'world::Prop',
    'world::Prop::new',
  ],
};
const levels = (stability: Stability): Record<string, StabilityLevel> =>
  Object.fromEntries(Object.entries(stability.badges).map(([slug, badge]) => [slug, badge.level]));

describe('Stability', () => {
  it('marks a module unstable when the list marks its whole path, and partly so when only some items', () => {
    const pages = [page('dev/world'), page('dev/map'), page('dev/actions'), page('dev/ui')];

    expect(levels(Stability.of(['world', 'map', 'actions', 'ui'], pages, paths))).toEqual({
      'dev/world': 'partial',
      'dev/map': 'unstable',
      'dev/actions': 'unstable',
      'dev/ui': 'stable',
    });
  });

  it('counts the items of a partly unstable module that need the feature among all it holds', () => {
    const stability = Stability.of(['world'], [page('dev/world')], paths);

    expect(stability.badges['dev/world']).toEqual({ level: 'partial', unstable: 2, items: 3 });
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
