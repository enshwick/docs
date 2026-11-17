import type { DeveloperPage } from './api-map.ts';
import type { ApiPaths } from './public-paths.ts';

/**
 * Whether a module of the API crate keeps the SemVer promise, needs the `unstable` feature, or keeps
 * it while some of its items need the feature.
 */
export type StabilityLevel = 'stable' | 'partial' | 'unstable';

/** A developer page's stability badge: its level, and for a partly unstable module the counts. */
export interface StabilityBadge {
  readonly level: StabilityLevel;
  /** How many of the module's items need the `unstable` feature. */
  readonly unstable: number;
  /** How many items the module holds, its submodules' included. */
  readonly items: number;
}

/**
 * The stability badge of each developer page that documents one public module of the API crate: a
 * module is unstable when the crate compiles it only with the `unstable` feature, as its public path
 * list marks it; partly unstable when it is not but some of its items are; and stable otherwise. A
 * page documents a module when its slug after the area, with folders as `::` and hyphens as
 * underscores, is the module's path in the list.
 */
export class Stability {
  private static readonly area = 'dev/';
  private static readonly separator = '::';

  private constructor(public readonly badges: Readonly<Record<string, StabilityBadge>>) {}

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
      pages.flatMap((page): Array<[string, StabilityBadge]> => {
        const path = Stability.modulePath(page.slug);

        if (path === undefined || !listed.has(path)) {
          return [];
        }

        if (!path.includes(Stability.separator) && !topLevel.has(path)) {
          return [];
        }

        return [[page.slug, Stability.badge(path, paths.all, gated)]];
      }),
    );

    return new Stability(badges);
  }

  private static badge(
    path: string,
    all: readonly string[],
    gated: ReadonlySet<string>,
  ): StabilityBadge {
    const prefix = `${path}${Stability.separator}`;
    const items = all.filter((item) => item.startsWith(prefix));
    const unstable = items.filter((item) => gated.has(item)).length;

    if (gated.has(path)) {
      return { level: 'unstable', unstable: items.length, items: items.length };
    }

    return { level: unstable > 0 ? 'partial' : 'stable', unstable, items: items.length };
  }

  private static modulePath(slug: string): string | undefined {
    if (!slug.startsWith(Stability.area)) {
      return undefined;
    }

    return slug
      .slice(Stability.area.length)
      .replaceAll('/', Stability.separator)
      .replaceAll('-', '_');
  }
}
