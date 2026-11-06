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
| \`events::PlayerDied\` and the \`killer\` fields of \`EntityDiedEvent\` | not yet seen |

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
      'killer',
      'map',
      'ui',
      'world',
    ]);
  });

  it('reads every module and item the unstable table names, but not one named for context', () => {
    expect(Stability.unstableNames(stabilityPage.body)).toEqual([
      'Field::MaxStackSize',
      'Load::fog_of_war',
      'Stats::set_item',
      'World',
      'entity_data',
      'events::PlayerDied',
      'item_data',
      'killer',
      'map',
      'world',
    ]);
  });

  it('marks a module the crate compiles only with the unstable feature, though the table misses it', () => {
    const stability = Stability.of(
      ['controls'],
      [stabilityPage, page('dev/controls')],
      ['controls'],
    );

    expect(stability.badges).toEqual({ 'dev/controls': 'unstable' });
    expect(stability.unstable).toContain('controls');
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

  it('fails when the book has no stability page, or its table names nothing', () => {
    expect(() => Stability.of(['map'], [page('dev/map')])).toThrow(/stability chapter/u);
    expect(() => Stability.of(['map'], [page('dev/stability')])).toThrow(/stability chapter/u);
  });
});
