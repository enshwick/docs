import type { StarlightRouteData } from '@astrojs/starlight/route-data';

import { Languages } from './languages.ts';

/** One tag of a page's `<head>`, in the shape Starlight's route data holds it. */
export type HeadEntry = StarlightRouteData['head'][number];

/**
 * Which pages exist in which language. Starlight serves a page that has no translation under every
 * other language too, as a fallback with the default language's text; such a copy must not compete
 * with its original in search, so it is kept out of the index, the languages list and the sitemap.
 */
export class Translations {
  private static readonly contentRoot = 'src/content/docs';
  private static readonly pages = '**/*.{md,mdx}';
  private static readonly index = 'index';
  private static readonly xDefault = 'x-default';

  private constructor(private readonly keys: ReadonlySet<string>) {}

  /** The pages of the content folder, as written before the build. */
  public static fromContent(): Translations {
    return Translations.fromFiles(
      Array.from(new Bun.Glob(Translations.pages).scanSync(Translations.contentRoot)),
    );
  }

  /** The pages of the given files, relative to the content folder, such as `uk/guides/install.mdx`. */
  public static fromFiles(files: readonly string[]): Translations {
    return new Translations(
      new Set(
        files.map((file) => {
          const key = file.replace(/\.mdx?$/u, '');

          return key === Translations.index ? key : key.replace(/\/index$/u, '');
        }),
      ),
    );
  }

  /** Whether the page at `path` is another language's copy of a page with no translation. */
  public isFallback(path: string): boolean {
    const key = Translations.key(path);
    const [first] = key.split('/');
    const translated = Languages.site.others.some((code) => code.toString() === first);

    return translated && !this.keys.has(key);
  }

  /** Whether the page at `url` belongs in the sitemap. */
  public inSitemap(url: string): boolean {
    return !this.isFallback(new URL(url).pathname);
  }

  /**
   * The head of the page at `path`: a fallback gets `noindex`, a canonical address on the default
   * language's page and no languages list; any other page lists only the languages it really has.
   */
  public head(entries: readonly HeadEntry[], path: string, site: string): HeadEntry[] {
    if (!this.isFallback(path)) {
      return entries.filter(
        (entry) =>
          !Translations.isLanguage(entry) ||
          entry.attrs?.['hreflang'] === Translations.xDefault ||
          !this.isFallback(new URL(String(entry.attrs?.['href'])).pathname),
      );
    }

    const original = new URL(Translations.originalPath(path), site).href;

    return [
      ...entries
        .filter((entry) => !Translations.isLanguage(entry))
        .map((entry) => Translations.pointedAt(entry, original)),
      { tag: 'meta', attrs: { name: 'robots', content: 'noindex' } },
    ];
  }

  /** The entry with its canonical or `og:url` address on `original`; any other entry as it is. */
  private static pointedAt(entry: HeadEntry, original: string): HeadEntry {
    if (entry.tag === 'link' && entry.attrs?.['rel'] === 'canonical') {
      return { ...entry, attrs: { ...entry.attrs, href: original } };
    }

    if (entry.tag === 'meta' && entry.attrs?.['property'] === 'og:url') {
      return { ...entry, attrs: { ...entry.attrs, content: original } };
    }

    return entry;
  }

  /** The default language's path of a page at `path`. */
  private static originalPath(path: string): string {
    const [, first = '', ...rest] = path.split('/');
    const translated = Languages.site.others.some((code) => code.toString() === first);

    return translated ? `/${rest.join('/')}` : path;
  }

  /** A path as a page key: `/uk/guides/install/` is `uk/guides/install`, `/` is `index`. */
  private static key(path: string): string {
    const key = path.replaceAll(/^\/+|\/+$/gu, '');

    return key === '' ? Translations.index : key;
  }

  private static isLanguage(entry: HeadEntry): boolean {
    return (
      entry.tag === 'link' &&
      entry.attrs?.['rel'] === 'alternate' &&
      entry.attrs['hreflang'] !== undefined
    );
  }
}
