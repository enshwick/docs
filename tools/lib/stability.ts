import { ApiSurface } from '../../src/site/api-surface.ts';
import type { StabilityBadge } from '../../src/site/stability-badges.ts';
import type { DeveloperPage } from './api-map.ts';
import type { ApiPaths } from './public-paths.ts';

/**
 * The stability badge of each developer page that documents one public module of the API crate: a
 * module is unstable when the crate compiles it only with the `unstable` feature, as its public path
 * list marks it; partly unstable when it is not but some items the page documents are; and stable
 * otherwise. A page documents a module when its slug after the area, with folders as `::` and
 * hyphens as underscores, is the module's path in the list.
 */
export class Stability {
  private static readonly area = 'dev/';

  private constructor(public readonly badges: Readonly<Record<string, StabilityBadge>>) {}

  /**
   * The badges of the pages among `pages` that document a module the list `paths` holds; a page in
   * the area's root documents a top-level module only when it is one of the crate root's `modules`.
   * A gated item counts once, as the outermost gated path (a member of a gated type or module is
   * gated with it): on the page of the deepest documented module that holds it, or, outside every
   * documented module (a crate root call such as `Load::add_recipe`), on each page that names it.
   */
  public static of(
    modules: readonly string[],
    pages: readonly DeveloperPage[],
    paths: ApiPaths,
  ): Stability {
    const gated = new Set(paths.unstable);
    const documented = Stability.documented(modules, pages, new Set(paths.all));
    const unstableItems = Stability.unstableItems(documented, gated);
    const badges = Object.fromEntries(
      [...documented].map(([path, page]): [string, StabilityBadge] => {
        const unstable = (unstableItems.get(path) ?? []).toSorted();
        const level = gated.has(path) ? 'unstable' : unstable.length > 0 ? 'partial' : 'stable';

        return [page.slug, { level, unstable }];
      }),
    );

    return new Stability(badges);
  }

  /** The pages that document a listed module, by the module's path. */
  private static documented(
    modules: readonly string[],
    pages: readonly DeveloperPage[],
    listed: ReadonlySet<string>,
  ): Map<string, DeveloperPage> {
    const topLevel = new Set(modules);

    return new Map(
      pages.flatMap((page): Array<[string, DeveloperPage]> => {
        const path = Stability.modulePath(page.slug);

        if (path === undefined || !listed.has(path)) {
          return [];
        }

        if (!path.includes(ApiSurface.pathSeparator) && !topLevel.has(path)) {
          return [];
        }

        return [[path, page]];
      }),
    );
  }

  /** The outermost gated items each documented module's page holds, by the module's path. */
  private static unstableItems(
    documented: ReadonlyMap<string, DeveloperPage>,
    gated: ReadonlySet<string>,
  ): Map<string, string[]> {
    const items = new Map<string, string[]>([...documented.keys()].map((path) => [path, []]));

    for (const item of gated) {
      const ancestors = Stability.ancestors(item);

      if (ancestors.some((ancestor) => gated.has(ancestor))) {
        continue;
      }

      const owner = ancestors.findLast((ancestor) => documented.has(ancestor));
      // A lone crate root name (`Script`) is too common a word to find a page by.
      const holders =
        owner === undefined
          ? ancestors.length === 0
            ? []
            : [...documented].flatMap(([path, page]) =>
                Stability.names(page.body, item) ? [path] : [],
              )
          : [owner];

      for (const holder of holders) {
        items.get(holder)?.push(item);
      }
    }

    return items;
  }

  /** The paths of the modules and types that hold `path`, outermost first. */
  private static ancestors(path: string): string[] {
    const parts = path.split(ApiSurface.pathSeparator);

    return parts.slice(1).map((_, end) => parts.slice(0, end + 1).join(ApiSurface.pathSeparator));
  }

  /** Whether a page names the path whole, so `Load::add_recipe` is not found in `Load::add_recipe_with`. */
  private static names(body: string, path: string): boolean {
    return new RegExp(`\\b${path}\\b`, 'u').test(body);
  }

  private static modulePath(slug: string): string | undefined {
    if (!slug.startsWith(Stability.area)) {
      return undefined;
    }

    return slug
      .slice(Stability.area.length)
      .replaceAll('/', ApiSurface.pathSeparator)
      .replaceAll('-', '_');
  }
}
