import { join } from 'node:path';

/** The checks of a built site that only the build output can answer, each problem as one line. */
export class DistCheck {
  private static readonly pages = '**/*.html';
  private static readonly styles = '**/*.css';
  private static readonly sitemaps = 'sitemap-*.xml';
  private static readonly sitemapIndex = 'sitemap-index.xml';
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

    return problems;
  }

  private async style(style: string): Promise<string[]> {
    const text = await Bun.file(join(this.root, style)).text();

    return Array.from(
      text.matchAll(DistCheck.wrongStyleUrl),
      ([, url]) => `${style}: url ${url} misses the site's root`,
    );
  }

  /** The sitemap's problems: every address must be a page of the site that search may index. */
  private async sitemap(): Promise<string[]> {
    const files = (await this.scan(DistCheck.sitemaps)).filter(
      (file) => file !== DistCheck.sitemapIndex,
    );

    if (files.length === 0) {
      return [`${this.root}: no sitemap`];
    }

    const entries = await Promise.all(
      files.map(async (file) => {
        const text = await Bun.file(join(this.root, file)).text();

        return Array.from(text.matchAll(DistCheck.location), ([, url = '']) => ({ file, url }));
      }),
    );
    const problems = await Promise.all(
      entries.flat().map(({ file, url }) => this.location(file, url)),
    );

    return problems.filter((problem): problem is string => problem !== undefined);
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
    return (await Array.fromAsync(new Bun.Glob(pattern).scan(this.root))).toSorted();
  }
}
