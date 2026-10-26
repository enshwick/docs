import { AnyString, n } from '@horizon-republic/nominal-types';

import { ModId } from './types.ts';

/** Who installs a mod: every side, the server or host only, or the player who wants it. */
export class Needs extends AnyString.subtype(
  'docs.Needs',
  n.oneOf('everyone', 'server', 'client'),
) {}

/** When a changed setting takes effect. */
export class Applies extends AnyString.subtype(
  'docs.Applies',
  n.oneOf('at-once', 'world-load', 'restart'),
) {}

/** A mod's summary for search results, Nexus and its card: at most 200 characters. */
export class Summary extends AnyString.subtype('docs.Summary', /^[^\n]{1,200}$/u) {}

/** One row of a mod's settings table. */
export const Setting = n.object({
  key: AnyString,
  default: AnyString,
  range: n.of(AnyString).optional(),
  meaning: AnyString,
  applies: Applies,
});

/** One picture of a mod, a path under its `docs/` folder and what to notice in it. */
export const Screenshot = n.object({ file: AnyString, alt: AnyString });

/**
 * The front matter of a mod's `docs/player.md` and of each translation, `docs/player.<language>.md`:
 * the single source of its site page, its Nexus text and its README.
 */
export const PlayerPageFrontMatter = n
  .object({
    id: ModId,
    name: AnyString,
    summary: Summary,
    needs: Needs,
    settings: Setting.array().optional(),
    screenshots: Screenshot.array().optional(),
    screenshot_game_version: n.of(AnyString).optional(),
  })
  .strict();
