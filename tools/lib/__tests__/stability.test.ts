import { describe, expect, it } from 'vitest';

import { Stability } from '../stability.ts';

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
  ],
  unstable: ['actions', 'actions::Action', 'content::knowledge', 'items', 'map', 'world::Prop'],
};

describe('Stability', () => {
  it('marks a module unstable only when the list marks its whole path, not a few of its items', () => {
    const pages = [page('dev/world'), page('dev/map'), page('dev/actions'), page('dev/ui')];

    expect(Stability.of(['world', 'map', 'actions', 'ui'], pages, paths).badges).toEqual({
      'dev/world': 'stable',
      'dev/map': 'unstable',
      'dev/actions': 'unstable',
      'dev/ui': 'stable',
    });
  });

  it('matches a page to its module by the page name, with hyphens as underscores', () => {
    const pages = [page('dev/item-data'), page('dev/settings'), page('dev/stability')];

    expect(Stability.of(['item_data', 'settings'], pages, paths).badges).toEqual({
      'dev/item-data': 'stable',
      'dev/settings': 'stable',
    });
  });

  it('reads a page in a folder as the nested module, not the top-level one of the same name', () => {
    const pages = [page('dev/content/items'), page('dev/content/knowledge')];

    expect(Stability.of(['items', 'knowledge', 'content'], pages, paths).badges).toEqual({
      'dev/content/items': 'stable',
      'dev/content/knowledge': 'unstable',
    });
  });

  it('gives no badge to a module the list lacks, or a listed path that is no crate root module', () => {
    const pages = [page('dev/test'), page('dev/controls')];

    expect(Stability.of(['test'], pages, paths).badges).toEqual({});
  });
});
