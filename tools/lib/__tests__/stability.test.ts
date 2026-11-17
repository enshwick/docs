import { describe, expect, it } from 'vitest';

import { Stability } from '../stability.ts';

const stabilityPage = {
  slug: 'dev/stability',
  title: 'Stability',
  body: `## What \`unstable\` holds

| Part | Why it is unstable |
| --- | --- |
| The edits of \`world\`: props. \`world::Prop\`, \`WorldError::NotAProp\` | not yet seen |
| \`map\` and \`Load::fog_of_war\`. Also the map markers of \`ui\`. | young |
| \`actions\` and \`console\` | young |

The API reference marks each of these items "Unstable".
`,
};
const page = (slug: string): { slug: string; title: string; body: string } => ({
  slug,
  title: slug,
  body: '',
});
const unstable = ['actions', 'actions::Action', 'map', 'world::Prop', 'WorldError::NotAProp'];

describe('Stability', () => {
  it('marks a module unstable only when the list marks its whole path, not when the chapter names it', () => {
    const pages = [
      stabilityPage,
      page('dev/world'),
      page('dev/map'),
      page('dev/actions'),
      page('dev/ui'),
    ];

    expect(Stability.of(['world', 'map', 'actions', 'ui'], pages, unstable).badges).toEqual({
      'dev/world': 'stable',
      'dev/map': 'unstable',
      'dev/actions': 'unstable',
      'dev/ui': 'stable',
    });
  });

  it('marks a gated module the chapter does not name', () => {
    const stability = Stability.of(
      ['controls'],
      [stabilityPage, page('dev/controls')],
      ['controls'],
    );

    expect(stability.badges).toEqual({ 'dev/controls': 'unstable' });
  });

  it('matches a page to its module by the page name, with hyphens as underscores', () => {
    const pages = [stabilityPage, page('dev/item-data'), page('dev/settings')];

    expect(Stability.of(['item_data', 'settings', 'config'], pages, ['item_data']).badges).toEqual({
      'dev/item-data': 'unstable',
      'dev/settings': 'stable',
    });
  });

  it('fails when the book has no stability page, or the page has no table', () => {
    expect(() => Stability.of(['map'], [page('dev/map')], [])).toThrow(/stability chapter/u);
    expect(() => Stability.of(['map'], [page('dev/stability')], [])).toThrow(/stability chapter/u);
  });
});
