import { AnyString, n } from '@horizon-republic/nominal-types';

import repositoriesData from '../data/repositories.json' with { type: 'json' };
import type { OgPage } from './og-card.ts';
import { Texts } from './texts.ts';
import { RepositoryName } from './types.ts';

/** A repository's description as its About box on GitHub takes it: one line of at most 350 characters. */
const RepositoryDescription = AnyString.subtype('docs.RepositoryDescription', /^[^\n]{1,350}$/u);

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
    n.object({ title: AnyString, description: n.of(RepositoryDescription).optional() }),
  );

  /** The text key of the description a repository without its own carries. */
  private static readonly siteDescription = 'site.description';
  /** The folder of the repositories' social cards under `/og/`. */
  private static readonly cardFolder = 'github';
  /** The dot a repository's name may open with, which a card's file name leaves out. */
  private static readonly leadingDot = /^\./u;

  /** The project's repositories, as `src/data/repositories.json` holds them. */
  public static readonly site = new Repositories(repositoriesData, Texts.site);

  /** A social card per repository, keyed by its path under `/og/`, such as `github/mods`. */
  public readonly cards: Readonly<Record<string, OgPage>>;

  public constructor(data: unknown, texts: Texts) {
    const parsed = Repositories.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`${Repositories.file}: ${JSON.stringify(parsed.issues)}`);
    }

    this.cards = Object.fromEntries(
      Object.entries(parsed.value).map(([repository, entry]) => [
        Repositories.cardPath(new RepositoryName(repository)),
        {
          title: entry.title.toString(),
          description: entry.description?.toString() ?? texts.get(Repositories.siteDescription),
        },
      ]),
    );
  }

  private static cardPath(repository: RepositoryName): string {
    return `${Repositories.cardFolder}/${repository.name.replace(Repositories.leadingDot, '')}`;
  }
}
