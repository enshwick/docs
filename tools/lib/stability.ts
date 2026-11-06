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
  /** A Rust path in backticks; `of ` before it marks a name given for context. */
  private static readonly itemName =
    /(?<context>\bof )?`(?<name>[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*)`/gu;

  private constructor(
    public readonly badges: Readonly<Record<string, StabilityLevel>>,
    /** Every module and item the chapter's unstable table names, sorted. */
    public readonly unstable: readonly string[] = [],
  ) {}

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
    const named = chapter === undefined ? [] : Stability.unstableNames(chapter.body);

    if (chapter === undefined || named.length === 0) {
      throw new Error(
        `the book's stability chapter (a page whose slug ends in ${Stability.pageName}) is missing or its table names nothing`,
      );
    }

    const unstable = new Set([...Stability.unstableModules(chapter.body), ...gated]);
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

    return new Stability(badges, [...new Set([...named, ...gated])].toSorted());
  }

  /**
   * Every name in the first column of the chapter's tables, modules and items alike, such as
   * `world` and `Knowledge::revoke`, without a name the row gives after "of" only for context once
   * it has named something, such as `ui` in "the map markers of `ui`" or `EntityDiedEvent` in "the
   * `killer` fields of `EntityDiedEvent`".
   */
  public static unstableNames(body: string): string[] {
    const names = new Set<string>();

    for (const row of body.matchAll(Stability.tableRow)) {
      let named = false;

      for (const match of (row.groups?.['part'] ?? '').matchAll(Stability.itemName)) {
        if (match.groups?.['context'] === undefined || !named) {
          names.add(match.groups?.['name'] ?? '');
        }

        named = true;
      }
    }

    return [...names].toSorted();
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
