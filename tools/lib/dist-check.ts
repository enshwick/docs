import { join, posix, sep } from 'node:path';

import { Languages } from '../../src/site/languages.ts';
import { Texts } from '../../src/site/texts.ts';
import { MetaDescription } from './meta-description.ts';

/** The checks of a built site that only the build output can answer, each problem as one line. */
export class DistCheck {
  private static readonly pages = '**/*.html';
  private static readonly styles = '**/*.css';
  private static readonly sitemaps = 'sitemap*.xml';
  /** Where search engines and people look for the sitemap first. */
  private static readonly sitemapEntry = 'sitemap.xml';
  private static readonly sitemapIndex = /<sitemapindex[\s>]/u;
  private static readonly pageFile = 'index.html';
  private static readonly notFound = '404.html';
  private static readonly none = 'none';
  /** A root-relative link to the old base, a doubled slash or a missing value in front of a path. */
  private static readonly wrongLink =
    /\b(?:href|src|content)="(\/docs\/[^"]*|\/\/favicon[^"]*|[^"]*undefined\/[^"]*)"/gu;
  private static readonly wrongStyleUrl = /url\(\s*['"]?(\/docs\/[^'")]*)/gu;
  private static readonly canonical = /<link rel="canonical" href="([^"]*)"/gu;
  private static readonly location = /<loc>([^<]+)<\/loc>/gu;
  private static readonly noindex = /<meta name="robots" content="noindex"/u;
  private static readonly description = /<meta name="description" content="([^"]*)"/u;
  private static readonly siteDescription = 'site.description';
  /** The entities a built attribute value carries, with the characters they stand for. */
  private static readonly entities: ReadonlyArray<readonly [string, string]> = [
    ['&quot;', '"'],
    ['&#39;', "'"],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&amp;', '&'],
  ];
  /** Where each language's pages start: `` for the root, `uk/` for the others. */
  private static readonly languagePrefixes = [
    '',
    ...Languages.site.others.map((language) => `${language}/`),
  ];
  /** The home page of each language, which states the site's description as its own. */
  private static readonly homes = DistCheck.languagePrefixes.map(
    (prefix) => `${prefix}${DistCheck.pageFile}`,
  );
  /** The description Starlight gives a page that states none, in each language. */
  private static readonly siteDescriptions = Languages.site.all.map(({ code }) =>
    Texts.site.get(DistCheck.siteDescription, code),
  );
  private static readonly table = /<table[\s>]/gu;
  /** A table that opens its frame: the scrolling div with nothing but space before the table. */
  private static readonly framedTable = /<div class="ew-table"[^>]*>\s*<table[\s>]/gu;

  /** The site built into `root`, to be served at the address `site`. */
  public constructor(
    private readonly root: string,
    private readonly site: string,
  ) {}

  /** Every problem of the site; none when it is clean. */
  public async run(): Promise<string[]> {
    const pages = await this.scan(DistCheck.pages);

    if (pages.length === 0) {
      return [`${this.root}: no pages; build the site first`];
    }

    const [ofPages, ofStyles, ofSitemap] = await Promise.all([
      Promise.all(pages.map((page) => this.page(page))),
      this.scan(DistCheck.styles).then((styles) =>
        Promise.all(styles.map((style) => this.style(style))),
      ),
      this.sitemap(),
    ]);

    return [...ofPages.flat(), ...ofStyles.flat(), ...ofSitemap];
  }

  /** A page's problems: wrong links, not exactly one canonical address, a path without a folder,
   * a table outside its scrolling frame. */
  private async page(page: string): Promise<string[]> {
    const text = await Bun.file(join(this.root, page)).text();
    const problems = Array.from(
      text.matchAll(DistCheck.wrongLink),
      ([, link]) => `${page}: link ${link} misses the site's root`,
    );
    const canonicals = Array.from(text.matchAll(DistCheck.canonical), ([, href]) => href);

    if (canonicals.length !== 1 || !(canonicals[0] ?? '').startsWith(`${this.site}/`)) {
      const found = canonicals.length === 0 ? DistCheck.none : canonicals.join(', ');

      problems.push(`${page}: wants one canonical address on ${this.site}, has ${found}`);
    }

    const tables = text.match(DistCheck.table)?.length ?? 0;
    const framed = text.match(DistCheck.framedTable)?.length ?? 0;

    if (framed < tables) {
      problems.push(
        `${page}: ${tables - framed} of ${tables} tables sit outside a scrolling frame`,
      );
    }

    if (page !== DistCheck.notFound && !page.endsWith(DistCheck.pageFile)) {
      problems.push(
        `${page}: a page outside a folder of its own answers without the trailing slash`,
      );
    }

    return [...problems, ...DistCheck.descriptionOf(page, text)];
  }

  /**
   * The problem of a page search may index whose description is missing, short or long. A page
   * without one gets the site's own from Starlight, so outside a home page that counts as missing.
   */
  private static descriptionOf(page: string, text: string): string[] {
    if (page === DistCheck.notFound || DistCheck.noindex.test(text)) {
      return [];
    }

    const [, found] = DistCheck.description.exec(text) ?? [];
    const description =
      found === undefined
        ? undefined
        : DistCheck.entities.reduce(
            (decoded, [entity, character]) => decoded.replaceAll(entity, character),
            found,
          );

    if (
      description === undefined ||
      (!DistCheck.homes.includes(page) && DistCheck.siteDescriptions.includes(description))
    ) {
      return [`${page}: has no description`];
    }

    return MetaDescription.fits(description)
      ? []
      : [
          `${page}: its description has ${MetaDescription.lengthOf(description)} characters, wants ${MetaDescription.shortest} to ${MetaDescription.longest}`,
        ];
  }

  private async style(style: string): Promise<string[]> {
    const text = await Bun.file(join(this.root, style)).text();

    return Array.from(
      text.matchAll(DistCheck.wrongStyleUrl),
      ([, url]) => `${style}: url ${url} misses the site's root`,
    );
  }

  /**
   * The sitemap's problems: it must answer at `/sitemap.xml`, every file an index lists must exist,
   * and every page address must be a page of the site that search may index.
   */
  private async sitemap(): Promise<string[]> {
    const files = await this.scan(DistCheck.sitemaps);

    if (!files.includes(DistCheck.sitemapEntry)) {
      return [`${this.root}: no ${DistCheck.sitemapEntry}`];
    }

    const texts = await Promise.all(
      files.map(async (file) => ({ file, text: await Bun.file(join(this.root, file)).text() })),
    );
    const problems = await Promise.all(
      texts.flatMap(({ file, text }) => {
        const urls = Array.from(text.matchAll(DistCheck.location), ([, url = '']) => url);

        return DistCheck.sitemapIndex.test(text)
          ? urls.map((url) => Promise.resolve(this.listed(file, url, files)))
          : urls.map((url) => this.location(file, url));
      }),
    );

    return problems.filter((problem): problem is string => problem !== undefined);
  }

  /** The problem of a sitemap index entry that names no sitemap file of the build. */
  private listed(file: string, url: string, files: string[]): string | undefined {
    const prefix = `${this.site}/`;

    return url.startsWith(prefix) && files.includes(url.slice(prefix.length))
      ? undefined
      : `${file}: ${url} names no sitemap file`;
  }

  private async location(file: string, url: string): Promise<string | undefined> {
    if (!url.startsWith(`${this.site}/`) || !url.endsWith('/')) {
      return `${file}: ${url} is not a page address on ${this.site}`;
    }

    const page = Bun.file(join(this.root, new URL(url).pathname, DistCheck.pageFile));

    if (!(await page.exists())) {
      return `${file}: ${url} has no page`;
    }

    return DistCheck.noindex.test(await page.text())
      ? `${file}: ${url} is a page search must not index`
      : undefined;
  }

  private async scan(pattern: string): Promise<string[]> {
    const found = await Array.fromAsync(new Bun.Glob(pattern).scan(this.root));

    // The scan answers in the platform's separator; the site's paths use `/`.
    return found.map((path) => path.split(sep).join(posix.sep)).toSorted();
  }
}
