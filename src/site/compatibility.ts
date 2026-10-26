import { AnyBoolean, AnyString, n } from '@horizon-republic/nominal-types';

/** One game build with a build table. */
const GameBuild = n.object({
  side: AnyString,
  name: AnyString,
  steamBuild: n.of(AnyString).optional(),
});

/**
 * The compatibility page's data, `src/generated/compatibility.json`, which `tools/fetch.ts` writes
 * from the platform's build tables and every mod's newest release.
 */
export const CompatibilityData = n.object({
  platform: n
    .object({ name: AnyString, api: n.of(AnyString).optional(), builds: GameBuild.array() })
    .array(),
  mods: n
    .object({
      slug: AnyString,
      name: AnyString,
      repository: AnyString,
      tag: AnyString,
      page: AnyBoolean,
      version: n.of(AnyString).optional(),
      api: n.of(AnyString).optional(),
      needs: n.of(AnyString).optional(),
    })
    .array(),
});
