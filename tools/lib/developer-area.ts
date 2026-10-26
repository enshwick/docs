import type { GitRef, RepositoryName } from '../../src/site/types.ts';
import { ChapterConverter } from './chapter-converter.ts';
import { GitSource } from './git-source.ts';
import { PageFile } from './page-file.ts';
import { type PageType, type SidebarEntry, Summary } from './summary.ts';

/** One version of the developer area as `src/data/sources.json` lists it, newest first. */
export interface DeveloperVersion {
  readonly name: string;
  readonly ref: GitRef;
}

/** Where the platform's book lives and which page type each chapter has. */
export interface PlatformSource {
  readonly repository: RepositoryName;
  readonly book: string;
  readonly versions: readonly DeveloperVersion[];
  readonly pageTypes: Readonly<Record<string, PageType>>;
}

/** The developer area: every version of the platform's book, the newest at `/dev/`, older ones under `/dev/<version>/`. */
export class DeveloperArea {
  public static readonly folder = 'dev';
  private static readonly changelog = 'crates/enshwick/CHANGELOG.md';
  private static readonly summary = 'SUMMARY.md';
  private static readonly defaultType: PageType = 'how-to';
  private static readonly mainBranch = 'main';

  public constructor(private readonly source: PlatformSource) {}

  /** Writes every version's pages and returns the area's sidebar. */
  public async build(): Promise<SidebarEntry[]> {
    const [newest, ...older] = await Promise.all(
      this.source.versions.map(async (version, index) => ({
        version,
        entries: await this.buildVersion(
          version,
          index === 0 ? DeveloperArea.folder : `${DeveloperArea.folder}/${version.name}`,
        ),
      })),
    );

    if (newest === undefined) {
      return [];
    }

    return [
      ...newest.entries,
      ...older.map(({ version, entries }) => ({
        label: version.name,
        collapsed: true,
        items: entries,
      })),
    ];
  }

  /** The page type of a chapter: its own entry, else the entry of the folder it is in, else how-to. */
  public pageType(path: string): PageType {
    const own = this.source.pageTypes[path];
    const folder = Object.entries(this.source.pageTypes).find(
      ([key]) => key.endsWith('/') && path.startsWith(key),
    );

    return own ?? folder?.[1] ?? DeveloperArea.defaultType;
  }

  private async buildVersion(version: DeveloperVersion, prefix: string): Promise<SidebarEntry[]> {
    const checkout = await GitSource.checkout(this.source.repository, version.ref, [
      `/${this.source.book}/`,
      `/${DeveloperArea.changelog}`,
    ]);
    const summary = Summary.parse(await this.require(checkout, DeveloperArea.summary));
    const index = summary.chapters[0]?.chapter.path;
    const slugOf = (path: string): string =>
      path === index ? prefix : `${prefix}/${path.replace(/\.md$/u, '')}`;
    const converter = new ChapterConverter((path) => `/${slugOf(path)}/`);
    const editable = version.ref.toString() === DeveloperArea.mainBranch;

    await Promise.all(
      summary.chapters.map(async ({ chapter }) => {
        const page = converter.convert(chapter.path, await this.require(checkout, chapter.path));
        const editUrl = editable
          ? `${this.source.repository.url}/edit/${version.ref}/${this.source.book}/${chapter.path}`
          : false;

        await new PageFile(
          chapter.path === index ? `${prefix}/index` : slugOf(chapter.path),
          {
            title: page.title,
            description: page.description,
            type: this.pageType(chapter.path),
            editUrl,
          },
          page.body,
        ).write();
      }),
    );

    const sidebar = summary.sidebar(slugOf);
    const changelog = await checkout.read(DeveloperArea.changelog);

    if (changelog !== undefined) {
      const slug = `${prefix}/changelog`;
      const page = converter.convert(DeveloperArea.changelog, changelog);

      await new PageFile(
        slug,
        { title: page.title, type: 'reference', editUrl: false },
        page.body,
      ).write();
      sidebar.push({ slug, label: page.title });
    }

    return sidebar;
  }

  /** A file of the book that must exist at the version's ref. */
  private async require(checkout: GitSource, path: string): Promise<string> {
    const text = await checkout.read(`${this.source.book}/${path}`);

    if (text === undefined) {
      throw new Error(
        `${this.source.repository}@${checkout.ref} has no ${this.source.book}/${path}`,
      );
    }

    return text;
  }
}
