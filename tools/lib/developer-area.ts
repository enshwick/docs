import type { GitRef, RepositoryName } from '../../src/site/types.ts';
import type { DeveloperPage } from './api-map.ts';
import { ChapterConverter } from './chapter-converter.ts';
import { Fields } from './fields.ts';
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

/** One game build the platform has a build table for. */
export interface GameBuild {
  readonly side: string;
  readonly name: string;
  readonly steamBuild: string | undefined;
}

/** What one platform version supports, for the compatibility page. */
export interface PlatformRelease {
  readonly name: string;
  readonly ref: string;
  readonly api: string | undefined;
  readonly builds: readonly GameBuild[];
  /** The API crate's root module, `lib.rs`. */
  readonly lib: string | undefined;
  /** The loader's error codes, `errors.toml`, where the version has them. */
  readonly errors: string | undefined;
}

/** The developer area: every version of the platform's book, the newest at `/dev/`, older ones under `/dev/<version>/`. */
export class DeveloperArea {
  public static readonly folder = 'dev';
  private static readonly changelog = 'crates/enshwick/CHANGELOG.md';
  private static readonly summary = 'SUMMARY.md';
  private static readonly defaultType: PageType = 'how-to';
  private static readonly mainBranch = 'main';
  private static readonly tables = 'crates/enshwick-gamedata/tables';
  private static readonly apiManifest = 'crates/enshwick/Cargo.toml';
  private static readonly apiRoot = 'crates/enshwick/src/lib.rs';
  public static readonly errorsSource = 'crates/internal/loader/src/errors.toml';

  /** The newest version's pages, filled by `build()`. */
  public readonly newestPages: DeveloperPage[] = [];

  /** What each version supports, filled by `build()`, newest first. */
  public readonly releases: PlatformRelease[] = [];

  public constructor(private readonly source: PlatformSource) {}

  /** Writes every version's pages and returns the area's sidebar. */
  public async build(): Promise<SidebarEntry[]> {
    const built = await Promise.all(
      this.source.versions.map((version, index) =>
        this.buildVersion(
          version,
          index === 0 ? DeveloperArea.folder : `${DeveloperArea.folder}/${version.name}`,
        ),
      ),
    );
    const [newest, ...older] = built;

    this.releases.push(...built.map(({ release }) => release));

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

  private async buildVersion(
    version: DeveloperVersion,
    prefix: string,
  ): Promise<{ version: DeveloperVersion; entries: SidebarEntry[]; release: PlatformRelease }> {
    const checkout = await GitSource.checkout(this.source.repository, version.ref, [
      `/${this.source.book}/`,
      `/${DeveloperArea.changelog}`,
      `/${DeveloperArea.tables}/`,
      `/${DeveloperArea.apiManifest}`,
      `/${DeveloperArea.apiRoot}`,
      `/${DeveloperArea.errorsSource}`,
    ]);
    const summary = Summary.parse(await this.require(checkout, DeveloperArea.summary));
    const index = summary.chapters[0]?.chapter.path;
    const slugOf = (path: string): string =>
      path === index ? prefix : `${prefix}/${path.replace(/\.md$/u, '')}`;
    const converter = new ChapterConverter((path) => `/${slugOf(path)}/`);

    await this.writeChapters(summary, checkout, version, prefix, slugOf);

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

    return { version, entries: sidebar, release: await DeveloperArea.release(version, checkout) };
  }

  /** Writes every chapter of the book as a page; the summary's first chapter is the area's index. */
  private async writeChapters(
    summary: Summary,
    checkout: GitSource,
    version: DeveloperVersion,
    prefix: string,
    slugOf: (path: string) => string,
  ): Promise<void> {
    const index = summary.chapters[0]?.chapter.path;
    const converter = new ChapterConverter((path) => `/${slugOf(path)}/`);
    const editable = version.ref.toString() === DeveloperArea.mainBranch;

    await Promise.all(
      summary.chapters.map(async ({ chapter }) => {
        const page = converter.convert(chapter.path, await this.require(checkout, chapter.path));
        const editUrl = editable
          ? `${this.source.repository.url}/edit/${version.ref}/${this.source.book}/${chapter.path}`
          : false;

        if (prefix === DeveloperArea.folder) {
          this.newestPages.push({ slug: slugOf(chapter.path), title: page.title, body: page.body });
        }

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

    const order = summary.chapters.map(({ chapter }) => slugOf(chapter.path));

    this.newestPages.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  }

  /** The API version and the game builds with a build table at the version's ref. */
  private static async release(
    version: DeveloperVersion,
    checkout: GitSource,
  ): Promise<PlatformRelease> {
    const manifest = await checkout.read(DeveloperArea.apiManifest);
    const api =
      manifest === undefined ? undefined : /^version\s*=\s*"([^"]+)"/mu.exec(manifest)?.[1];
    const files = await Array.fromAsync(
      new Bun.Glob('*.toml').scan(checkout.path(DeveloperArea.tables)),
    );
    const builds = await Promise.all(
      files.toSorted().map(async (file): Promise<GameBuild> => {
        // Only the header: the tables hold 64-bit addresses, which no JavaScript number holds.
        const text = (await checkout.read(`${DeveloperArea.tables}/${file}`)) ?? '';
        const header = text.slice(0, text.search(/^\[/mu));
        const table = new Fields(Bun.TOML.parse(header));
        const side = table.at('side').text();
        const name = table.at('name').text();
        const steamBuild = table.at('steam_build').value;

        return {
          side: side ?? file,
          name: name ?? file,
          steamBuild: typeof steamBuild === 'number' ? String(steamBuild) : undefined,
        };
      }),
    );

    return {
      name: version.name,
      ref: version.ref.toString(),
      api,
      builds,
      lib: await checkout.read(DeveloperArea.apiRoot),
      errors: await checkout.read(DeveloperArea.errorsSource),
    };
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
