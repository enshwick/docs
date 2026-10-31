import { describe, expect, it } from 'vitest';

import { Stability } from '../stability.ts';

const stabilityPage = {
  slug: 'dev/stability',
  title: 'Stability',
  body: `## What \`unstable\` holds

| Part | Why it is unstable |
| --- | --- |
| \`world\`: \`World\`, its players, chat | young |
| \`map\`, \`Load::fog_of_war\` and the map markers of \`ui\` | young |
| \`item_data\` and \`entity_data\`, \`Stats::set_item\` | stays aside |
| Changes of \`Field::MaxStackSize\` from a mod | not yet seen |

The API reference marks each of these items "Unstable".
`,
};
const page = (slug: string): { slug: string; title: string; body: string } => ({
  slug,
  title: slug,
  body: '',
});

describe('Stability', () => {
  it('reads the modules the unstable table names, not the items or types beside them', () => {
    expect([...Stability.unstableModules(stabilityPage.body)].toSorted()).toEqual([
      'entity_data',
      'item_data',
      'map',
      'ui',
      'world',
    ]);
  });

  it('marks the page of each public module stable or unstable, by the page name', () => {
    const pages = [stabilityPage, page('dev/map'), page('dev/item-data'), page('dev/settings')];
    const modules = ['map', 'item_data', 'config', 'settings'];

    expect(Stability.of(modules, pages).badges).toEqual({
      'dev/map': 'unstable',
      'dev/item-data': 'unstable',
      'dev/settings': 'stable',
    });
  });

  it('marks nothing when the book has no stability page', () => {
    expect(Stability.of(['map'], [page('dev/map')]).badges).toEqual({});
  });
});
