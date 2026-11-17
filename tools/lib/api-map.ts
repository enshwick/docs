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
   * `::{self}` or `::{self as <name>}` under its own name, which a module beside a macro of the same
   * name needs.
   */
  private static readonly publicModule =
    /^((?:#\[[^\n]*\]\r?\n)*)pub (?:mod ([a-z0-9_]+)|use (enshwick_[a-z0-9_]+)::([a-z0-9_]+)(?:::\{self(?: as ([a-z0-9_]+))?\})?);/gmu;
  /** Every re-export through `self` in any spelling, so one `publicModule` cannot read fails the build. */
  private static readonly selfReexport =
    /^pub use enshwick_[a-z0-9_]+::[a-z0-9_]+::\{[^}]*\bself\b[^}]*\};/gmu;
  // Hidden modules, such as macro support, are no part of the documented API.
  private static readonly hidden = /#\[doc\(hidden\)\]/u;
  private static readonly crateName = 'enshwick';
  /** The macro crate's lowercase items are macros, not modules. */
  private static readonly macroCrate = 'enshwick_macros';

  private constructor(public readonly modules: readonly ApiModule[]) {}

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
    const read = [...lib.matchAll(ApiMap.publicModule)].filter(
      (match) => match[5] === undefined || match[5] === match[4],
    );
    const unread = [...lib.matchAll(ApiMap.selfReexport)]
      .map(([line]) => line)
      .filter((line) => !read.some(([match]) => match.endsWith(line)));

    if (unread.length > 0) {
      throw new Error(
        `the API map reads a module re-export only as ::{self} or ::{self as <its own name>}: ${unread.join(' ')}`,
      );
    }

    return read
      .filter((match) => match[3] !== ApiMap.macroCrate)
      .map((match) => ({
        attributes: match[1] ?? '',
        name: match[2] ?? match[4] ?? '',
        crate: match[3],
      }));
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
