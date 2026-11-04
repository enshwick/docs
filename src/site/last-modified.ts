/**
 * The date of each page's last commit, for the sitemap's `lastmod`. Only pages written in this
 * repository have one; a page `tools/fetch.ts` generates from another repository has none.
 */
export class LastModified {
  private static readonly contentRoot = 'src/content/docs/';
  /** Starts each commit in the log, so the date line is told from the file names after it. */
  private static readonly commitMark = '\u0000';

  private constructor(private readonly dates: ReadonlyMap<string, string>) {}

  /** The dates from this repository's history; without git, no page has a date. */
  public static fromGit(): LastModified {
    const log = Bun.spawnSync([
      'git',
      'log',
      '--format=%x00%cI',
      '--name-only',
      '--',
      LastModified.contentRoot,
    ]);

    return LastModified.fromLog(log.success ? log.stdout.toString() : '');
  }

  /** The dates from `git log --format=%x00%cI --name-only`, newest commit first. */
  public static fromLog(log: string): LastModified {
    const dates = new Map<string, string>();

    for (const commit of log.split(LastModified.commitMark).slice(1)) {
      const [date = '', ...files] = commit.trim().split('\n');

      for (const file of files) {
        if (!file.startsWith(LastModified.contentRoot)) {
          continue;
        }

        const key = LastModified.key(file.slice(LastModified.contentRoot.length));

        // The log runs newest first, so a page's first date is its last change.
        if (!dates.has(key)) {
          dates.set(key, date);
        }
      }
    }

    return new LastModified(dates);
  }

  /** The last change of the page at `url`, or `undefined` when it has no file in this repository. */
  public of(url: string): string | undefined {
    return this.dates.get(LastModified.key(new URL(url).pathname));
  }

  /** A content file or a URL path as one page key: `uk/guides/install.md` and `/uk/guides/install/`. */
  private static key(path: string): string {
    return path
      .replace(/\.mdx?$/u, '')
      .replace(/(^|\/)index$/u, '')
      .replaceAll(/^\/+|\/+$/gu, '');
  }
}
