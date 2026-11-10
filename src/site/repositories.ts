import { AnyString, n } from '@horizon-republic/nominal-types';

import repositoriesData from '../data/repositories.json' with { type: 'json' };
import type { OgPage } from './og-card.ts';
import { Texts } from './texts.ts';
import { RepositoryName } from './types.ts';

/**
 * A repository's description as its About box on GitHub takes it: one line of at most 350
 * characters, with no control character and no space at either end.
 */
const RepositoryDescription = AnyString.subtype(
  'docs.RepositoryDescription',
  /^\S(?:[^\p{Cc}\p{Zl}\p{Zp}]{0,348}\S)?$/u,
);

/** A repository's title on its social card: one line with no space at either end. */
const RepositoryTitle = AnyString.subtype(
  'docs.RepositoryTitle',
  /^\S(?:[^\p{Cc}\p{Zl}\p{Zp}]*\S)?$/u,
);

/**
 * The project's repositories as GitHub presents them, from `src/data/repositories.json`: each
 * one's title and the description of its About box. A repository without a description of its
 * own carries the site's, so the platform's words change in one place.
 */
export class Repositories {
  /** Where the repositories live, for messages that point a writer at them. */
  public static readonly file = 'src/data/repositories.json';
  private static readonly schema = n.record(
    RepositoryName,
    n.object({ title: RepositoryTitle, description: n.of(RepositoryDescription).optional() }),
  );

  /** The text key of the description a repository without its own carries. */
  private static readonly siteDescription = 'site.description';
  /** The folder of the repositories' social cards under `/og/`. */
  private static readonly cardFolder = 'github';
  /** The dot a repository's name may open with, which a card's file name leaves out. */
  private static readonly leadingDot = /^\./u;
  /**
   * A card name served at `/og/github/<name>.png` as it stands: the og route cuts a name at its
   * last dot and serves `index` as the folder itself, so neither may appear.
   */
  private static readonly servedName = /^(?!index$)[A-Za-z0-9_-]+$/u;
  private static readonly sharedCard = 'two repositories share one card';
  private static readonly unservedCard = 'a card name the og route would change';
  private static readonly longSiteDescription = `${Repositories.siteDescription} does not fit an About box`;
  private static readonly pageCard = 'a page has the path of a repository card';

  /** The project's repositories, as `src/data/repositories.json` holds them. */
  public static readonly site = new Repositories(repositoriesData, Texts.site);

  /** A social card per repository, keyed by its path under `/og/`, such as `github/mods`. */
  public readonly cards: Readonly<Record<string, OgPage>>;

  public constructor(data: unknown, texts: Texts) {
    const parsed = Repositories.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`${Repositories.file}: ${JSON.stringify(parsed.issues)}`);
    }

    const cards = Object.entries(parsed.value).map(
      ([repository, entry]) =>
        [
          Repositories.cardPath(new RepositoryName(repository)),
          {
            title: entry.title.toString(),
            description: (entry.description ?? Repositories.siteOwn(texts)).toString(),
          },
        ] as const,
    );

    this.cards = Object.fromEntries(cards);

    if (Object.keys(this.cards).length !== cards.length) {
      throw new TypeError(`${Repositories.file}: ${Repositories.sharedCard}`);
    }
  }

  /**
   * The og route's pages with every repository card beside them; a page whose id is a card's path
   * would lose its own card, so it is refused.
   */
  public beside<Page>(pages: Readonly<Record<string, Page>>): Record<string, Page | OgPage> {
    const taken = Object.keys(this.cards).find((path) => Object.hasOwn(pages, path));

    if (taken !== undefined) {
      throw new TypeError(`${Repositories.file}: ${Repositories.pageCard}: ${taken}`);
    }

    return { ...pages, ...this.cards };
  }

  /** The site's description, checked as an About box takes it, for a repository without its own. */
  private static siteOwn(texts: Texts): InstanceType<typeof RepositoryDescription> {
    const parsed = RepositoryDescription.parse(texts.get(Repositories.siteDescription));

    if (!parsed.ok) {
      throw new TypeError(`${Repositories.file}: ${Repositories.longSiteDescription}`);
    }

    return parsed.value;
  }

  private static cardPath(repository: RepositoryName): string {
    const name = repository.name.replace(Repositories.leadingDot, '');

    if (!Repositories.servedName.test(name)) {
      throw new TypeError(`${Repositories.file}: ${Repositories.unservedCard}: ${repository}`);
    }

    return `${Repositories.cardFolder}/${name}`;
  }
}
