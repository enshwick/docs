import type { DeveloperPage } from './api-map.ts';

/** Whether a module of the API crate keeps the SemVer promise or needs the `unstable` feature. */
export type StabilityLevel = 'stable' | 'unstable';

/**
 * The stability badge of each developer page that documents one public module of the API crate,
 * read from the table of the book's stability chapter: a module it names under `unstable` is
 * unstable, every other public module stable. A page documents a module when its last path part,
 * with hyphens as underscores, is the module's name.
 */
export class Stability {
  private static readonly pageName = 'stability';
  private static readonly tableRow = /^\|(?<part>[^|\n]+)\|/gmu;
  private static readonly moduleName = /`(?<name>[a-z][a-z0-9_]*)`/gu;

  private constructor(public readonly badges: Readonly<Record<string, StabilityLevel>>) {}

  /**
   * The badges of the pages among `pages` that document one of `modules`; a module in `gated`, which
   * the crate compiles only with the `unstable` feature, is unstable whatever the chapter says.
   *
   * @throws {Error} When the book has no stability chapter or its table names nothing, since every
   * covered API would then read as stable.
   */
  public static of(
    modules: readonly string[],
    pages: readonly DeveloperPage[],
    gated: readonly string[] = [],
  ): Stability {
    const chapter = pages.find((page) => page.slug.split('/').at(-1) === Stability.pageName);
    const named =
      chapter === undefined ? new Set<string>() : Stability.unstableModules(chapter.body);

    if (chapter === undefined || named.size === 0) {
      throw new Error(
        `the book's stability chapter (a page whose slug ends in ${Stability.pageName}) is missing or its table names nothing`,
      );
    }

    const unstable = new Set([...named, ...gated]);
    const known = new Set(modules);
    const badges = Object.fromEntries(
      pages.flatMap((page): Array<[string, StabilityLevel]> => {
        const name = (page.slug.split('/').at(-1) ?? '').replaceAll('-', '_');

        if (!known.has(name)) {
          return [];
        }

        return [[page.slug, unstable.has(name) ? 'unstable' : 'stable']];
      }),
    );

    return new Stability(badges);
  }

  /** The bare module names in the first column of the chapter's tables: `world`, not `World`. */
  public static unstableModules(body: string): ReadonlySet<string> {
    const names = new Set<string>();

    for (const row of body.matchAll(Stability.tableRow)) {
      for (const match of (row.groups?.['part'] ?? '').matchAll(Stability.moduleName)) {
        names.add(match.groups?.['name'] ?? '');
      }
    }

    return names;
  }
}
