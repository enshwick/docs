import { Fields } from './fields.ts';

/** One game build the platform has a compatibility report for. */
export interface GameBuild {
  readonly side: string;
  readonly steamBuild: string | undefined;
  readonly gameVersion: string | undefined;
  /** The loader features that are off or partly off on the build, from its report. */
  readonly off: readonly string[];
  /** The day `cargo xtask compat` checked the build, `YYYY-MM-DD`; reports before that field have none. */
  readonly checked: string | undefined;
}

/**
 * Reads the game builds of a platform version from their compatibility reports: every build has
 * one, also a build the platform runs without a table of its own.
 */
export class GameBuildFiles {
  private static readonly side = 'side';
  private static readonly steamBuild = 'steam_build';
  private static readonly gameVersion = 'game_version';
  private static readonly feature = 'feature';
  private static readonly featureName = 'name';
  private static readonly checked = 'checked';
  private static readonly day = /^\d{4}-\d{2}-\d{2}$/u;

  /** The build of report `file` from its text. */
  public static read(file: string, report: string): GameBuild {
    const fields = new Fields(Bun.TOML.parse(report));

    const number = (key: string): string | undefined => {
      const value = fields.at(key).value;

      return typeof value === 'number' ? String(value) : undefined;
    };

    const features = fields.at(GameBuildFiles.feature).value;
    const checked = fields.at(GameBuildFiles.checked).text();

    return {
      checked: checked !== undefined && GameBuildFiles.day.test(checked) ? checked : undefined,
      side: fields.at(GameBuildFiles.side).text() ?? file,
      steamBuild: number(GameBuildFiles.steamBuild),
      gameVersion: number(GameBuildFiles.gameVersion),
      off: (Array.isArray(features) ? features : []).flatMap((feature) => {
        const name = new Fields(feature).at(GameBuildFiles.featureName).text();

        return name === undefined ? [] : [name];
      }),
    };
  }

  /**
   * `builds` oldest first, so the last of a side is its newest: by Steam build when both have one,
   * since it grows with every build, else by game version, then Steam build.
   */
  public static ordered<T extends GameBuild>(builds: readonly T[]): T[] {
    const version = (build: GameBuild): number => Number(build.gameVersion ?? 0);
    const steam = (build: GameBuild): number => Number(build.steamBuild ?? 0);

    return builds.toSorted((a, b) =>
      a.steamBuild !== undefined && b.steamBuild !== undefined
        ? steam(a) - steam(b)
        : version(a) - version(b) || steam(a) - steam(b),
    );
  }

  /**
   * The newest build of each side, sides in name order: Enshwick supports the latest game version,
   * and the reports of older builds stay a test record the site does not publish.
   */
  public static newest<T extends GameBuild>(builds: readonly T[]): T[] {
    const bySide = new Map(GameBuildFiles.ordered(builds).map((build) => [build.side, build]));

    return [...bySide.values()].toSorted((a, b) => a.side.localeCompare(b.side));
  }
}
