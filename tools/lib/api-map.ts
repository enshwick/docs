/** A developer page as the API map reads it. */
export interface DeveloperPage {
  readonly slug: string;
  readonly title: string;
  readonly body: string;
}

/** One public module of the API crate and the developer pages that cover it. */
export interface ApiModule {
  readonly name: string;
  readonly pages: readonly { readonly slug: string; readonly title: string }[];
}

/**
 * The public modules of the `enshwick` crate, each with the developer pages that name it. `llms.txt`
 * lists it, and the build fails when a module has no page, so the two stay in step.
 */
export class ApiMap {
  private static readonly publicModule = /^pub mod ([a-z0-9_]+);/gmu;
  private static readonly crateName = 'enshwick';

  private constructor(public readonly modules: readonly ApiModule[]) {}

  /** The map of the crate root `lib`, against the newest version's developer pages. */
  public static of(lib: string, pages: readonly DeveloperPage[]): ApiMap {
    const names = [...lib.matchAll(ApiMap.publicModule)].map((match) => match[1] ?? '');

    return new ApiMap(
      names.map((name) => ({
        name,
        pages: pages
          .filter((page) => ApiMap.mentions(page.body, name))
          .map(({ slug, title }) => ({ slug, title })),
      })),
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
