import { renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Puts the sitemap at `/sitemap.xml`, the address people and crawlers try first. While one file
 * holds every page, that file itself moves there; once the pages need several files, their index
 * moves there instead and keeps pointing at them.
 */
export class SitemapFile {
  /** Where the sitemap is published, relative to the site's root. */
  public static readonly path = 'sitemap.xml';
  private static readonly index = 'sitemap-index.xml';
  private static readonly location = /<loc>[^<]*\/([^/<]+)<\/loc>/gu;

  /** Moves the sitemap `@astrojs/sitemap` wrote into `directory` to {@link SitemapFile.path}. */
  public static async publish(directory: string): Promise<void> {
    const index = join(directory, SitemapFile.index);
    const files = SitemapFile.files(await Bun.file(index).text());
    const [only] = files;

    if (files.length === 1 && only !== undefined) {
      renameSync(join(directory, only), join(directory, SitemapFile.path));
      rmSync(index);

      return;
    }

    renameSync(index, join(directory, SitemapFile.path));
  }

  /** The file names a sitemap index lists, such as `sitemap-0.xml`. */
  public static files(index: string): string[] {
    return Array.from(index.matchAll(SitemapFile.location), ([, file = '']) => file);
  }
}
