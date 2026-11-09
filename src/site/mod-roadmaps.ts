import { Translations } from './translations.ts';
import type { LanguageCode } from './types.ts';

/** The fields of a content entry a page of aims is listed and linked by, as Starlight gives them. */
export interface RoadmapEntry {
  readonly id: string;
  readonly data: {
    readonly title: string;
    readonly draft?: boolean | undefined;
    readonly sidebar: {
      readonly label?: string | undefined;
      readonly order?: number | undefined;
    };
  };
}

/** One link to a mod's page of aims, with its site path in the reader's language. */
export interface RoadmapLink {
  readonly path: string;
  readonly label: string;
}

/**
 * The mods' pages of aims, `roadmaps/<last part of the mod's folder>` in the root language and each
 * translation. The aims page lists them and a mod's card links its own, both from this one class.
 */
export class ModRoadmaps {
  /** The content folder of the pages of aims, which is also their sidebar group. */
  public static readonly folder = 'roadmaps';

  private constructor(
    private readonly roots: readonly RoadmapEntry[],
    private readonly byId: ReadonlyMap<string, RoadmapEntry>,
  ) {}

  /** The published pages of aims among the site's content entries; drafts are left out. */
  public static from(entries: readonly RoadmapEntry[]): ModRoadmaps {
    const published = entries.filter((entry) => entry.data.draft !== true);
    const roots = published
      .filter((entry) => entry.id.startsWith(`${ModRoadmaps.folder}/`))
      .toSorted(
        (a, b) =>
          (a.data.sidebar.order ?? Number.POSITIVE_INFINITY) -
            (b.data.sidebar.order ?? Number.POSITIVE_INFINITY) || a.id.localeCompare(b.id),
      );

    return new ModRoadmaps(roots, new Map(published.map((entry) => [entry.id, entry])));
  }

  /**
   * Every page of aims in sidebar order, each labelled from its translation in `language` where one
   * exists, else from the root language's page, which Starlight then serves as the fallback.
   */
  public links(language: LanguageCode): RoadmapLink[] {
    return this.roots.map((root) => {
      const path = Translations.pathIn(`/${root.id}/`, language);
      const page = this.byId.get(path.replaceAll(/^\/|\/$/gu, '')) ?? root;

      return { path, label: page.data.sidebar.label ?? page.data.title };
    });
  }

  /** The site path of the page of aims of the mod in `folder`, or `undefined` when it has none. */
  public pathOf(folder: string): string | undefined {
    const id = `${ModRoadmaps.folder}/${folder.split('/').at(-1) ?? folder}`;

    return this.roots.some((root) => root.id === id) ? `/${id}/` : undefined;
  }
}
