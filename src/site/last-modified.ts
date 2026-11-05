import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The date of each page's last change, for the sitemap's `lastmod`: a page written in this
 * repository has its last commit here; a page `tools/fetch.ts` generates from another repository
 * has the `lastUpdated` date of its source that its front matter states.
 */
export class LastModified {
  private static readonly contentRoot = 'src/content/docs/';
  /** Starts each commit in the log, so the date line is told from the file names after it. */
  private static readonly commitMark = '\u0000';
  private static readonly pageFiles = '**/*.{md,mdx}';
  private static readonly fence = /^---\s*$/mu;
  /** A `slug` in front matter, which moves a page away from the address its file path gives. */
  private static readonly slugLine = /^slug:\s*['"]?([^'"\r\n]+)/mu;
  /** A generated page's date, which `false` replaces when its source has none. */
  private static readonly dateLine = /^lastUpdated:\s*['"]?(\d{4}-\d{2}-\d{2}T[^'"\r\n]+)/mu;

  private constructor(private readonly dates: ReadonlyMap<string, string>) {}

  /**
   * The dates from this repository's history and the generated pages' front matter; without git,
   * only generated pages have a date.
   */
  public static fromGit(): LastModified {
    const log = Bun.spawnSync([
      'git',
      // Keeps non-ASCII file names as they are instead of quoted octal escapes.
      '-c',
      'core.quotePath=false',
      'log',
      '--format=%x00%cI',
      '--name-only',
      '--',
      LastModified.contentRoot,
    ]);

    const { slugs, stated } = LastModified.frontMatter();

    return LastModified.fromLog(log.success ? log.stdout.toString() : '', slugs, stated);
  }

  /**
   * The dates from `git log --format=%x00%cI --name-only`, newest commit first; `slugs` maps a
   * content file, such as `ai-assistants.md`, to the slug its front matter gives it, and `stated`
   * a content file to the date its front matter states, which wins over the log.
   */
  public static fromLog(
    log: string,
    slugs: ReadonlyMap<string, string> = new Map(),
    stated: ReadonlyMap<string, string> = new Map(),
  ): LastModified {
    const dates = new Map<string, string>();

    for (const [file, date] of stated) {
      dates.set(LastModified.key(slugs.get(file) ?? file), date);
    }

    for (const commit of log.split(LastModified.commitMark).slice(1)) {
      const [date = '', ...files] = commit.trim().split('\n');

      for (const file of files) {
        if (!file.startsWith(LastModified.contentRoot)) {
          continue;
        }

        const page = file.slice(LastModified.contentRoot.length);
        const key = LastModified.key(slugs.get(page) ?? page);

        // The log runs newest first, so a page's first date is its last change.
        if (!dates.has(key)) {
          dates.set(key, date);
        }
      }
    }

    return new LastModified(dates);
  }

  /**
   * The last change of the page at `url` on a site served under `base`, or `undefined` when the
   * page has no file in this repository.
   */
  public of(url: string, base = ''): string | undefined {
    const path = new URL(url).pathname;

    return this.dates.get(LastModified.key(path.startsWith(base) ? path.slice(base.length) : path));
  }

  /** Each content file whose front matter sets a `slug` or states a `lastUpdated` date, with it. */
  private static frontMatter(): {
    slugs: Map<string, string>;
    stated: Map<string, string>;
  } {
    const slugs = new Map<string, string>();
    const stated = new Map<string, string>();

    for (const found of new Bun.Glob(LastModified.pageFiles).scanSync(LastModified.contentRoot)) {
      // Bun's glob gives Windows separators on Windows; git names files with URL slashes.
      const file = found.replaceAll('\\', '/');
      const text = readFileSync(join(LastModified.contentRoot, file), 'utf8');
      const [, frontMatter = ''] = text.split(LastModified.fence);
      const [, slug] = LastModified.slugLine.exec(frontMatter) ?? [];
      const [, date] = LastModified.dateLine.exec(frontMatter) ?? [];

      if (slug !== undefined) {
        slugs.set(file, slug.trim());
      }

      if (date !== undefined) {
        stated.set(file, date.trim());
      }
    }

    return { slugs, stated };
  }

  /** A content file or a URL path as one page key: `uk/guides/install.md` and `/uk/guides/install/`. */
  private static key(path: string): string {
    return path
      .replace(/\.mdx?$/u, '')
      .replace(/(^|\/)index$/u, '')
      .replaceAll(/^\/+|\/+$/gu, '');
  }
}
