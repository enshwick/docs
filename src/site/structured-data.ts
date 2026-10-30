/** One node of the site's JSON-LD. */
export type JsonLdNode = Record<string, unknown>;

/** An entry of Starlight's sidebar, with only the fields the breadcrumbs read. */
export type SidebarItem =
  | { type: 'link'; label: string; href: string; isCurrent: boolean }
  | { type: 'group'; label: string; entries: SidebarItem[] };

/** What a documentation page says about itself. */
export interface ArticlePage {
  readonly path: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly lang: string;
  /** The real date of the page's last change; a page without one has no date at all. */
  readonly lastUpdated: Date | undefined;
}

/**
 * The schema.org description of the site for search engines: the project on the home page, an
 * article with its breadcrumbs on every other page.
 */
export class StructuredData {
  private static readonly context = 'https://schema.org';
  private static readonly name = 'Enshwick';
  private static readonly email = 'contact@enshwick.com';
  private static readonly github = 'https://github.com/enshwick';
  private static readonly nexus = 'https://www.nexusmods.com/site/mods/2511';
  private static readonly logo = '/apple-touch-icon-180.png';
  private static readonly download = 'https://github.com/enshwick/enshwick/releases';
  private static readonly description =
    'A mod loader for Enshrouded with the mods built on it, and an API platform for writing mods in Rust or Luau.';

  public constructor(private readonly site: string) {}

  /** The home page's nodes: the organization, the website and the application. */
  public home(lang: string, version: string | undefined): JsonLdNode[] {
    const url = this.url('/');

    return [
      {
        '@context': StructuredData.context,
        '@type': 'Organization',
        name: StructuredData.name,
        url,
        logo: this.url(StructuredData.logo),
        email: StructuredData.email,
        sameAs: [StructuredData.github, StructuredData.nexus],
      },
      {
        '@context': StructuredData.context,
        '@type': 'WebSite',
        name: StructuredData.name,
        url,
        inLanguage: lang,
      },
      {
        '@context': StructuredData.context,
        '@type': 'SoftwareApplication',
        name: StructuredData.name,
        description: StructuredData.description,
        url,
        downloadUrl: StructuredData.download,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Windows',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        ...(version === undefined ? {} : { softwareVersion: version }),
      },
    ];
  }

  /** A documentation page's nodes: the article and its breadcrumbs from the sidebar. */
  public article(
    page: ArticlePage,
    sidebar: readonly SidebarItem[],
    homeLabel: string,
  ): JsonLdNode[] {
    const url = this.url(page.path);
    const groups = StructuredData.pathTo(sidebar) ?? [];
    const crumbs = [
      { name: homeLabel, item: this.url(`/${page.lang === 'en' ? '' : `${page.lang}/`}`) },
      ...groups.flatMap((group) => {
        const first = StructuredData.firstLink(group.entries);

        return first === undefined || this.url(first) === url
          ? []
          : [{ name: group.label, item: this.url(first) }];
      }),
      { name: page.title, item: url },
    ];

    return [
      {
        '@context': StructuredData.context,
        '@type': 'TechArticle',
        headline: page.title,
        ...(page.description === undefined ? {} : { description: page.description }),
        inLanguage: page.lang,
        url,
        ...(page.lastUpdated === undefined ? {} : { dateModified: page.lastUpdated.toISOString() }),
        publisher: { '@type': 'Organization', name: StructuredData.name, url: this.url('/') },
      },
      {
        '@context': StructuredData.context,
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map(({ name, item }, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name,
          item,
        })),
      },
    ];
  }

  /** The nodes as the text of a `<script type="application/ld+json">`, safe inside HTML. */
  public static script(nodes: readonly JsonLdNode[]): string {
    return JSON.stringify(nodes).replaceAll('<', '\\u003c');
  }

  private url(path: string): string {
    return new URL(path, this.site).href;
  }

  /** The groups from the sidebar's top down to the current page, or `undefined` off the sidebar. */
  private static pathTo(
    items: readonly SidebarItem[],
  ): Extract<SidebarItem, { type: 'group' }>[] | undefined {
    for (const item of items) {
      if (item.type === 'link') {
        if (item.isCurrent) {
          return [];
        }

        continue;
      }

      const below = StructuredData.pathTo(item.entries);

      if (below !== undefined) {
        return [item, ...below];
      }
    }

    return undefined;
  }

  private static firstLink(items: readonly SidebarItem[]): string | undefined {
    for (const item of items) {
      const href = item.type === 'link' ? item.href : StructuredData.firstLink(item.entries);

      if (href !== undefined) {
        return href;
      }
    }

    return undefined;
  }
}
