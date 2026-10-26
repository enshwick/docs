import { ApiMap } from './api-map.ts';
import type { DeveloperPage } from './api-map.ts';
import type { PlatformRelease } from './developer-area.ts';
import { IdRule } from './id-rule.ts';

/** The checks that hold the site to the platform's newest version; the build fails when one does not pass. */
export class PlatformChecks {
  public constructor(
    private readonly newest: PlatformRelease | undefined,
    private readonly pages: readonly DeveloperPage[],
  ) {}

  /**
   * Checks the mod id rules and the API map against the newest release, and returns the map.
   *
   * @throws {Error} naming what differs.
   */
  public run(): ApiMap {
    const idRule = IdRule.of(this.newest?.abi ?? '');

    if (idRule.examples.length === 0) {
      throw new Error("no examples of the mod id rules found in the API crate's abi.rs");
    }

    if (idRule.disagreements.length > 0) {
      throw new Error(
        `the site's mod id rules differ from the API crate's: ${idRule.disagreements.join('; ')}`,
      );
    }

    const apiMap = ApiMap.of(this.newest?.lib ?? '', this.pages);

    if (apiMap.uncovered.length > 0) {
      throw new Error(
        `no developer page names these modules of the API crate: ${apiMap.uncovered.join(', ')}`,
      );
    }

    return apiMap;
  }
}
