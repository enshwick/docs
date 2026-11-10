import { AnyBoolean, AnyString, n } from '@horizon-republic/nominal-types';

/**
 * One game build with a compatibility report: its Steam build and game version where the report
 * names them, and the loader features off or partly off on it, absent in data older than reports.
 */
const GameBuild = n.object({
  side: AnyString,
  steamBuild: n.of(AnyString).optional(),
  gameVersion: n.of(AnyString).optional(),
  off: n.of(AnyString).array().optional(),
});

/**
 * The compatibility page's data, `src/generated/compatibility.json`, which `tools/fetch.ts` writes
 * from the platform's compatibility reports and every mod's newest release.
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
      tag: n.of(AnyString).optional(),
      page: AnyBoolean,
      version: n.of(AnyString).optional(),
      api: n.of(AnyString).optional(),
      needs: n.of(AnyString).optional(),
    })
    .array(),
});
