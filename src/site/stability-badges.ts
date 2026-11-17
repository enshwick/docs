import { AnyString, type InputOf, n } from '@horizon-republic/nominal-types';

/** Whether a module keeps the SemVer promise, needs the `unstable` feature, or keeps it in part. */
const StabilityLevel = AnyString.subtype(
  'docs.StabilityLevel',
  n.oneOf('stable', 'partial', 'unstable'),
);

/**
 * The stability badge of each developer page that documents one module of the API crate, by page
 * slug, as `src/generated/stability.json` holds it: the module's level and the paths of the items
 * the page documents that need the `unstable` feature while their module does not.
 */
export const StabilityBadges = n.record(
  AnyString,
  n.object({ level: StabilityLevel, unstable: n.of(AnyString).array() }),
);

/** One page's badge as `tools/fetch.ts` writes it, before the site parses it. */
export type StabilityBadge = InputOf<typeof StabilityBadges>[string];
