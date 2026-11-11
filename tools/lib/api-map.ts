import { Stability } from './stability.ts';

/** A developer page as the API map reads it. */
export interface DeveloperPage {
  readonly slug: string;
  readonly title: string;
  readonly body: string;
}

/** One public module of the API crate and the developer pages that cover it. */
export interface ApiModule {
  readonly name: string;
  readonly pages: ReadonlyArray<{ readonly slug: string; readonly title: string }>;
}

/**
 * The public modules of the `enshwick` crate, each with the developer pages that name it. `llms.txt`
 * lists it, and the build fails when a module has no page, so the two stay in step.
 */
export class ApiMap {
  /**
   * A module the crate declares, or one it re-exports whole from an internal crate, with the attribute
   * lines above it, so a `#[doc(hidden)]` one is left out. A re-export may name the module alone with
   * `::{self}`, which a module beside a macro of the same name needs.
   */
  private static readonly publicModule =
    /^((?:#\[[^\n]*\]\r?\n)*)pub (?:mod ([a-z0-9_]+)|use (enshwick_[a-z0-9_]+)::([a-z0-9_]+)(?:::\{self\})?);/gmu;
  // Hidden modules, such as macro support, are no part of the documented API.
  private static readonly hidden = /#\[doc\(hidden\)\]/u;
  // A module the crate compiles only with the `unstable` feature is unstable, listed or not.
  private static readonly gate = /#\[cfg\(feature = "unstable"\)\]/u;
  private static readonly crateName = 'enshwick';
  /** The macro crate's lowercase items are macros, not modules. */
  private static readonly macroCrate = 'enshwick_macros';

  private constructor(
    public readonly modules: readonly ApiModule[],
    private readonly pages: readonly DeveloperPage[],
    /** The public modules behind the `unstable` feature. */
    public readonly gated: readonly string[] = [],
  ) {}

  /** The map of the crate root `lib`, against the newest version's developer pages. */
  public static of(lib: string, pages: readonly DeveloperPage[]): ApiMap {
    const shown = ApiMap.declared(lib).filter(({ attributes }) => !ApiMap.hidden.test(attributes));

    return new ApiMap(
      shown.map(({ name }) => ({
        name,
        pages: pages
          .filter((page) => ApiMap.mentions(page.body, name))
          .map(({ slug, title }) => ({ slug, title })),
      })),
      pages,
      shown.filter(({ attributes }) => ApiMap.gate.test(attributes)).map(({ name }) => name),
    );
  }

  /** The internal crate, such as `enshwick_abi`, the crate root `lib` re-exports module `name` from, if any. */
  public static origin(lib: string, name: string): string | undefined {
    return ApiMap.declared(lib).find((module) => module.name === name)?.crate;
  }

  /** Every module the crate root declares or re-exports, hidden ones included. */
  private static declared(
    lib: string,
  ): Array<{ attributes: string; name: string; crate: string | undefined }> {
    return [...lib.matchAll(ApiMap.publicModule)]
      .filter((match) => match[3] !== ApiMap.macroCrate)
      .map((match) => ({
        attributes: match[1] ?? '',
        name: match[2] ?? match[4] ?? '',
        crate: match[3],
      }));
  }

  /** The stability badge of each page that documents one module, from the stability chapter. */
  public get stability(): Stability {
    return Stability.of(
      this.modules.map((module) => module.name),
      this.pages,
      this.gated,
    );
  }

  /** The modules no developer page covers. */
  public get uncovered(): readonly string[] {
    return this.modules.filter((module) => module.pages.length === 0).map((module) => module.name);
  }

  /** The map as Markdown for `llms.txt`: each module with links to its pages under `siteUrl`. */
  public markdown(siteUrl: string): string {
    return [
      `Public modules of the \`${ApiMap.crateName}\` crate and the guide pages that document them:`,
      '',
      ...this.modules.map(
        (module) =>
          `- \`${ApiMap.crateName}::${module.name}\`: ${module.pages
            .map((page) => `[${page.title}](${siteUrl}/${page.slug}/)`)
            .join(', ')}`,
      ),
    ].join('\n');
  }

  /** Whether a page names the module: a link to its source, its crate path, or a path through it. */
  private static mentions(body: string, name: string): boolean {
    return (
      body.includes(`src/${name}.rs`) ||
      body.includes(`src/${name}/`) ||
      new RegExp(`\\b${ApiMap.crateName}::${name}\\b`, 'u').test(body) ||
      new RegExp(`\\b${name}::`, 'u').test(body)
    );
  }
}
