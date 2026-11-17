import type { DeveloperPage } from './api-map.ts';

/** Whether a module of the API crate keeps the SemVer promise or needs the `unstable` feature. */
export type StabilityLevel = 'stable' | 'unstable';

/**
 * The stability badge of each developer page that documents one public module of the API crate: a
 * module is unstable when the crate compiles it only with the `unstable` feature, as its public path
 * list marks it, and stable otherwise. A page documents a module when its last path part, with
 * hyphens as underscores, is the module's name.
 */
export class Stability {
  private static readonly pageName = 'stability';
  private static readonly tableRow = /^\|[^|\n]+\|/mu;

  private constructor(public readonly badges: Readonly<Record<string, StabilityLevel>>) {}

  /**
   * The badges of the pages among `pages` that document one of `modules`; `unstable` holds the
   * crate's public paths only its `unstable` feature compiles. The book's stability chapter, which
   * every badge links to, must be there, but only the list decides a badge: a chapter row that names
   * a module for a few of its items leaves the module stable.
   *
   * @throws {Error} When the book has no stability chapter or the chapter has no table, since every
   * badge would then link to nothing.
   */
  public static of(
    modules: readonly string[],
    pages: readonly DeveloperPage[],
    unstable: readonly string[],
  ): Stability {
    const chapter = pages.find((page) => page.slug.split('/').at(-1) === Stability.pageName);

    if (chapter === undefined || !Stability.tableRow.test(chapter.body)) {
      throw new Error(
        `the book's stability chapter (a page whose slug ends in ${Stability.pageName}) is missing or has no table`,
      );
    }

    const gated = new Set(unstable);
    const known = new Set(modules);
    const badges = Object.fromEntries(
      pages.flatMap((page): Array<[string, StabilityLevel]> => {
        const name = (page.slug.split('/').at(-1) ?? '').replaceAll('-', '_');

        if (!known.has(name)) {
          return [];
        }

        return [[page.slug, gated.has(name) ? 'unstable' : 'stable']];
      }),
    );

    return new Stability(badges);
  }
}
