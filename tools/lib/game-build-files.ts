import { Fields } from './fields.ts';

/** One game build the platform has a compatibility report for. */
export interface GameBuild {
  readonly side: string;
  readonly steamBuild: string | undefined;
  readonly gameVersion: string | undefined;
  /** The loader features that are off or partly off on the build, from its report. */
  readonly off: readonly string[];
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

  /** The build of report `file` from its text. */
  public static read(file: string, report: string): GameBuild {
    const fields = new Fields(Bun.TOML.parse(report));

    const number = (key: string): string | undefined => {
      const value = fields.at(key).value;

      return typeof value === 'number' ? String(value) : undefined;
    };

    const features = fields.at(GameBuildFiles.feature).value;

    return {
      side: fields.at(GameBuildFiles.side).text() ?? file,
      steamBuild: number(GameBuildFiles.steamBuild),
      gameVersion: number(GameBuildFiles.gameVersion),
      off: (Array.isArray(features) ? features : []).flatMap((feature) => {
        const name = new Fields(feature).at(GameBuildFiles.featureName).text();

        return name === undefined ? [] : [name];
      }),
    };
  }

  /** `builds` oldest first, by game version, then Steam build, so the last of a side is its newest. */
  public static ordered(builds: readonly GameBuild[]): GameBuild[] {
    const version = (build: GameBuild): number => Number(build.gameVersion ?? 0);
    const steam = (build: GameBuild): number => Number(build.steamBuild ?? 0);

    return builds.toSorted((a, b) => version(a) - version(b) || steam(a) - steam(b));
  }
}
