import type { DeveloperPage } from './api-map.ts';
import type { ApiPaths } from './public-paths.ts';

/** Whether a module of the API crate keeps the SemVer promise or needs the `unstable` feature. */
export type StabilityLevel = 'stable' | 'unstable';

/**
 * The stability badge of each developer page that documents one public module of the API crate: a
 * module is unstable when the crate compiles it only with the `unstable` feature, as its public path
 * list marks it, and stable otherwise. A page documents a module when its slug after the area, with
 * folders as `::` and hyphens as underscores, is the module's path in the list.
 */
export class Stability {
  private static readonly area = 'dev/';

  private constructor(public readonly badges: Readonly<Record<string, StabilityLevel>>) {}

  /**
   * The badges of the pages among `pages` that document a module the list `paths` holds; a page in
   * the area's root documents a top-level module only when it is one of the crate root's `modules`.
   */
  public static of(
    modules: readonly string[],
    pages: readonly DeveloperPage[],
    paths: ApiPaths,
  ): Stability {
    const listed = new Set(paths.all);
    const gated = new Set(paths.unstable);
    const topLevel = new Set(modules);
    const badges = Object.fromEntries(
      pages.flatMap((page): Array<[string, StabilityLevel]> => {
        const path = Stability.modulePath(page.slug);

        if (path === undefined || !listed.has(path)) {
          return [];
        }

        if (!path.includes('::') && !topLevel.has(path)) {
          return [];
        }

        return [[page.slug, gated.has(path) ? 'unstable' : 'stable']];
      }),
    );

    return new Stability(badges);
  }

  private static modulePath(slug: string): string | undefined {
    if (!slug.startsWith(Stability.area)) {
      return undefined;
    }

    return slug.slice(Stability.area.length).replaceAll('/', '::').replaceAll('-', '_');
  }
}
