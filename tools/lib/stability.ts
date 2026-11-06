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
  private static readonly bareModule = /^[a-z][a-z0-9_]*$/u;
  /** A Rust path in backticks; `of ` before a bare module name marks it as given for context. */
  private static readonly itemName =
    /(?<context>\bof )?`(?<name>[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*)`/gu;

  private constructor(
    public readonly badges: Readonly<Record<string, StabilityLevel>>,
    /** Every module and item the chapter's unstable table names, sorted. */
    public readonly unstable: readonly string[] = [],
  ) {}

  /** The badges of the pages among `pages` that document one of `modules`. */
  public static of(modules: readonly string[], pages: readonly DeveloperPage[]): Stability {
    const chapter = pages.find((page) => page.slug.split('/').at(-1) === Stability.pageName);

    if (chapter === undefined) {
      return new Stability({});
    }

    const unstable = Stability.unstableModules(chapter.body);
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

    return new Stability(badges, Stability.unstableNames(chapter.body));
  }

  /**
   * Every name in the first column of the chapter's tables, modules and items alike, such as
   * `world` and `Knowledge::revoke`, without a module the row names after "of" only for context,
   * such as `ui` in "the map markers of `ui`".
   */
  public static unstableNames(body: string): string[] {
    const names = new Set<string>();

    for (const row of body.matchAll(Stability.tableRow)) {
      for (const match of (row.groups?.['part'] ?? '').matchAll(Stability.itemName)) {
        const name = match.groups?.['name'] ?? '';

        if (match.groups?.['context'] === undefined || !Stability.bareModule.test(name)) {
          names.add(name);
        }
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
