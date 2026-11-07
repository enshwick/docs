import { ApiMap } from './api-map.ts';
import type { DeveloperPage } from './api-map.ts';
import { BookSnippet } from './book-snippet.ts';
import type { PlatformRelease } from './developer-area.ts';
import { IdRule } from './id-rule.ts';

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
