import { AnyBoolean, AnyString, n } from '@horizon-republic/nominal-types';

/**
 * The game version one side was last checked on, from its newest compatibility report: the
 * features off or partly off on it, and the day, `YYYY-MM-DD`, the report last changed.
 */
const CheckedBuild = n.object({
  side: AnyString,
  gameVersion: n.of(AnyString).optional(),
  off: n.of(AnyString).array(),
  checked: n.of(AnyString).optional(),
});

/**
 * The compatibility page's data, `src/generated/compatibility.json`, which `tools/fetch.ts` writes
 * from the newest platform release's newest compatibility report of each side and every mod's
 * newest release. Enshwick supports the latest game version, so no older build is published.
 */
export const CompatibilityData = n.object({
  platform: n
    .object({ name: AnyString, api: n.of(AnyString).optional(), checked: CheckedBuild.array() })
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
