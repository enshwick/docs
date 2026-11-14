/** One node of the site's JSON-LD. */
export type JsonLdNode = Record<string, unknown>;

/** An entry of Starlight's sidebar, with only the fields the breadcrumbs read. */
export type SidebarItem =
  | { type: 'link'; label: string; href: string; isCurrent: boolean }
  | { type: 'group'; label: string; entries: SidebarItem[] };

/** What the home page says about the project, in its own language. */
export interface HomePage {
  readonly description: string;
  /** The questions the page shows with their answers, in the page's order. */
  readonly questions: ReadonlyArray<{ readonly question: string; readonly answer: string }>;
}

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
  /** Fallback site names for Google, in order of preference, the bare domain last. */
  private static readonly alternateNames = ['enshwick', 'enshwick.com'];
  private static readonly email = 'contact@enshwick.com';
  private static readonly github = 'https://github.com/enshwick';
  private static readonly logo = '/logo-512.png';
  private static readonly download = 'https://github.com/enshwick/enshwick/releases';
  private static readonly license = 'https://github.com/enshwick/docs/blob/main/LICENSE';

  public constructor(private readonly site: string) {}

  /**
   * The home page's nodes: the organization, the website, the application in the page's words, and
   * the questions the page answers on it.
   */
  public home(lang: string, version: string | undefined, page: HomePage): JsonLdNode[] {
    const url = this.url('/');

    return [
      {
        '@context': StructuredData.context,
        '@type': 'Organization',
        name: StructuredData.name,
        url,
        logo: this.url(StructuredData.logo),
        email: StructuredData.email,
        sameAs: [StructuredData.github],
      },
      {
        '@context': StructuredData.context,
        '@type': 'WebSite',
        name: StructuredData.name,
        alternateName: StructuredData.alternateNames,
        url,
        inLanguage: lang,
      },
      {
        '@context': StructuredData.context,
        '@type': 'SoftwareApplication',
        name: StructuredData.name,
        description: page.description,
        url,
        downloadUrl: StructuredData.download,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Windows',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        inLanguage: lang,
        ...(version === undefined ? {} : { softwareVersion: version }),
      },
      ...(page.questions.length === 0
        ? []
        : [
            {
              '@context': StructuredData.context,
              '@type': 'FAQPage',
              inLanguage: lang,
              mainEntity: page.questions.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
              })),
            },
          ]),
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

  /**
   * A page that renders a data file the site also publishes: the data set, its date and where to
   * download it, beside the page's article.
   */
  public dataset(page: ArticlePage, updated: string, download: string): JsonLdNode {
    return {
      '@context': StructuredData.context,
      '@type': 'Dataset',
      name: page.title,
      ...(page.description === undefined ? {} : { description: page.description }),
      url: this.url(page.path),
      inLanguage: page.lang,
      dateModified: updated,
      isAccessibleForFree: true,
      license: StructuredData.license,
      creator: { '@type': 'Organization', name: StructuredData.name, url: this.url('/') },
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: this.url(download),
      },
    };
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
  ): Array<Extract<SidebarItem, { type: 'group' }>> | undefined {
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
