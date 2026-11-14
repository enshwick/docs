import type { GitRef, RepositoryName } from '../../src/site/types.ts';
import { GameBuildFiles } from './game-build-files.ts';
import { GitSource } from './git-source.ts';

/**
 * The game version one side was last checked on: its newest compatibility report, the features
 * off on it and the day of the check, `YYYY-MM-DD`.
 */
export interface CheckedBuild {
  readonly side: string;
  readonly gameVersion: string | undefined;
  readonly off: readonly string[];
  readonly checked: string | undefined;
}

/** The newest game build of each side the platform's compatibility reports name, with its check day. */
export class CheckedBuilds {
  /** What the loader finds on each game build, one compatibility report per build. */
  public static readonly reports = 'crates/enshwick-gamedata/reports';
  /**
   * The builds at `ref`, such as the newest release's tag, so the compatibility page names what that
   * release was checked on.
   */
  public static async at(repository: RepositoryName, ref: GitRef): Promise<CheckedBuild[]> {
    const checkout = await GitSource.checkout(repository, ref, [`/${CheckedBuilds.reports}/`], {
      history: false,
    });

    return CheckedBuilds.of(checkout);
  }

  /**
   * The builds among the checkout's reports, each dated by the day its report records it was first
   * checked; a report that records no day has none, since its last commit may only reseal it.
   */
  public static async of(checkout: Pick<GitSource, 'path' | 'read'>): Promise<CheckedBuild[]> {
    const files = await Array.fromAsync(
      new Bun.Glob('*.toml').scan(checkout.path(CheckedBuilds.reports)),
    );
    const builds = await Promise.all(
      files.map(async (file) =>
        GameBuildFiles.read(file, (await checkout.read(`${CheckedBuilds.reports}/${file}`)) ?? ''),
      ),
    );

    return GameBuildFiles.newest(builds).map(({ side, gameVersion, off, checked }) => ({
      side,
      gameVersion,
      off,
      checked,
    }));
  }
}
