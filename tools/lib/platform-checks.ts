import { ApiMap } from './api-map.ts';
import type { DeveloperPage } from './api-map.ts';
import { BookSnippet } from './book-snippet.ts';
import type { PlatformRelease } from './developer-area.ts';
import { IdRule } from './id-rule.ts';
import { Stability } from './stability.ts';

/** The checks that hold the site to the platform's newest version; the build fails when one does not pass. */
export class PlatformChecks {
  /**
   * The examples the book compiles and marks for the site, by name, each with the chapter that holds
   * it: the front page shows the smallest whole mod, the page for AI assistants a mod with settings.
   */
  private static readonly marked = new Map([
    ['smallest-mod', 'dev/getting-started'],
    ['altar-count', 'dev/altars'],
  ]);
  /** The stability chapter, which the coverage page and the page for AI assistants link to. */
  private static readonly stabilitySlug = 'dev/stability';
  /** A table row whose first cell holds something, header rows included. */
  private static readonly tableRow = /^\|[^|\n]+\|/mu;

  public constructor(
    private readonly newest: PlatformRelease | undefined,
    private readonly pages: readonly DeveloperPage[],
  ) {}

  /**
   * Checks the mod id rules and the API map against the newest release, and returns the map.
   *
   * @throws {Error} naming what differs.
   */
  public run(): ApiMap {
    const idRule = IdRule.of(this.newest?.abi ?? '');

    if (idRule.examples.length === 0) {
      throw new Error("no examples of the mod id rules found in the API crate's abi.rs");
    }

    if (idRule.disagreements.length > 0) {
      throw new Error(
        `the site's mod id rules differ from the API crate's: ${idRule.disagreements.join('; ')}`,
      );
    }

    const apiMap = ApiMap.of(this.newest?.lib ?? '', this.pages);

    if (apiMap.uncovered.length > 0) {
      throw new Error(
        `no developer page names these modules of the API crate: ${apiMap.uncovered.join(', ')}`,
      );
    }

    return apiMap;
  }

  /**
   * The stability badge of each page that documents one of the crate root's `modules`, from the
   * newest release's public path list.
   *
   * @throws {Error} When the book has no stability chapter with a table at the slug the site links
   * to, or the newest release has no public path list, since every module would then read as stable.
   */
  public stability(modules: readonly string[]): Stability {
    const chapter = this.pages.find((page) => page.slug === PlatformChecks.stabilitySlug);

    if (chapter === undefined || !PlatformChecks.tableRow.test(chapter.body)) {
      throw new Error(
        `the book's stability chapter (${PlatformChecks.stabilitySlug}) is missing or has no table`,
      );
    }

    if (this.newest?.items === undefined) {
      throw new Error('the newest platform release has no public path list to read stability from');
    }

    return Stability.of(modules, this.pages, this.newest.items);
  }

  /**
   * The code of every example the book marks for the site, by its name.
   *
   * @throws {Error} naming the chapter that no longer marks its example.
   */
  public snippets(): Map<string, string> {
    return new Map(
      [...PlatformChecks.marked].map(([name, slug]) => {
        const chapter = this.pages.find((page) => page.slug === slug);
        const code = chapter === undefined ? undefined : new BookSnippet(chapter.body).named(name);

        if (code === undefined) {
          throw new Error(`the book's ${slug} chapter marks no ${name} example for the site`);
        }

        return [name, code];
      }),
    );
  }
}
