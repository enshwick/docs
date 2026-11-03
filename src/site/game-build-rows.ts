import type { CompatibilityData } from './compatibility.ts';

/** The parsed compatibility data. */
type Compat = Extract<ReturnType<typeof CompatibilityData.parse>, { ok: true }>['value'];
/** One game build of a platform release. */
type Build = Compat['platform'][number]['builds'][number];

/** How Enshwick runs on one game build. */
export enum BuildState {
  /** The loader finds everything it needs. */
  Works = 'works',
  /** Some loader features are off; the rest works. */
  Partly = 'partly',
  /** No table is made for it yet; the loader carries the newest table and turns off what it cannot find. */
  Unchecked = 'unchecked',
  /** It has a table, but no report of what the loader finds on it. */
  Unreported = 'unreported',
}

/** One row of the build table: a build with a table, or a newer game version one side lacks. */
export interface BuildRow {
  readonly side: string;
  readonly name: string | undefined;
  readonly steamBuild: string | undefined;
  readonly gameVersion: string | undefined;
  readonly state: BuildState;
  readonly off: readonly string[];
}

/**
 * The compatibility page's rows for one release's game builds, newest first: each build with its
 * state, and a row not checked yet for a side that lacks the newest game version another side has,
 * such as the game when only the dedicated server's new build is pinned.
 */
export class GameBuildRows {
  /** The rows of `builds`. */
  public static of(builds: readonly Build[]): readonly BuildRow[] {
    const rows = builds.map((build): BuildRow => {
      const off = build.off?.map((name) => name.toString());

      return {
        side: build.side.toString(),
        name: build.name.toString(),
        steamBuild: build.steamBuild?.toString(),
        gameVersion: build.gameVersion?.toString(),
        state:
          off === undefined
            ? BuildState.Unreported
            : off.length === 0
              ? BuildState.Works
              : BuildState.Partly,
        off: off ?? [],
      };
    });
    const newest = Math.max(0, ...rows.map((row) => GameBuildRows.version(row)));
    const sides = [...new Set(rows.map((row) => row.side))];
    const lacking = sides
      .filter(
        (side) => !rows.some((row) => row.side === side && GameBuildRows.version(row) === newest),
      )
      .map((side): BuildRow => ({
        side,
        name: undefined,
        steamBuild: undefined,
        gameVersion: String(newest),
        state: BuildState.Unchecked,
        off: [],
      }));

    return [...lacking, ...rows].toSorted(
      (a, b) =>
        GameBuildRows.version(b) - GameBuildRows.version(a) ||
        Number(b.steamBuild ?? 0) - Number(a.steamBuild ?? 0),
    );
  }

  /** A row's game version as a number, 0 without one. */
  private static version(this: void, row: BuildRow): number {
    return Number(row.gameVersion ?? 0);
  }
}
