import type { GitRef, RepositoryName } from '../../src/site/types.ts';
import type { DeveloperPage } from './api-map.ts';
import { type ChapterPage, ChapterConverter } from './chapter-converter.ts';
import { type CheckedBuild, CheckedBuilds } from './checked-builds.ts';
import { type ErrorsFile, ErrorPages } from './error-pages.ts';
import { GitSource } from './git-source.ts';
import { MdxBody } from './mdx-body.ts';
import { ModuleFile } from './module-file.ts';
import { PageFile } from './page-file.ts';
import { type PageType, type SidebarEntry, Summary } from './summary.ts';

/** One version of the developer area as `src/data/sources.json` lists it, newest first. */
export interface DeveloperVersion {
  readonly name: string;
  readonly ref: GitRef;
}

/** Where the platform's book lives; each chapter declares its own page type. */
export interface PlatformSource {
  readonly repository: RepositoryName;
  readonly book: string;
  readonly versions: readonly DeveloperVersion[];
}

/** What one platform version supports, for the compatibility page. */
export interface PlatformRelease {
  readonly name: string;
  readonly ref: string;
  readonly api: string | undefined;
  /** The newest build of each side; older reports are a test record, not published. */
  readonly checked: readonly CheckedBuild[];
  /** The API crate's root module, `lib.rs`. */
  readonly lib: string | undefined;
  /** The API crate's ABI module, `abi.rs`, which documents the id rules. */
  readonly abi: string | undefined;
  /** The loader's error codes, `errors.toml`, where the version has them. */
  readonly errors: ErrorsFile | undefined;
}

/** The developer area: every version of the platform's book, the newest at `/dev/`, older ones under `/dev/<version>/`. */
export class DeveloperArea {
  public static readonly folder = 'dev';
  private static readonly changelog = 'crates/enshwick/CHANGELOG.md';
  /** The changelog has no opening comment of its own; release-plz writes it. */
  private static readonly changelogDescription =
    'What changed in each release of the enshwick crate, the API every mod builds against: what was added, changed, removed and fixed.';
  private static readonly summary = 'SUMMARY.md';
  private static readonly mainBranch = 'main';
  private static readonly apiManifest = 'crates/enshwick/Cargo.toml';
  private static readonly apiRoot = 'crates/enshwick/src/lib.rs';
  /** The workspace manifest, which says where each internal crate of the API lives. */
  private static readonly workspaceManifest = 'Cargo.toml';
  /** The module whose `is_valid_id` examples hold the mod id rules. */
  private static readonly abiModule = 'abi';

  /** The newest version's pages, filled by `build()`. */
  public readonly newestPages: DeveloperPage[] = [];

  /** What each version supports, filled by `build()`, newest first. */
  public readonly releases: PlatformRelease[] = [];

  public constructor(private readonly source: PlatformSource) {}

  /** Writes every version's pages and returns the area's sidebar, where no group opens with itself. */
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

    const sidebar = [
      ...newest.entries,
      ...older.map(({ version, entries }) => ({
        label: version.name,
        collapsed: true,
        items: entries,
      })),
    ];
    const repeating = Summary.repeats(sidebar);

    if (repeating.length > 0) {
      throw new TypeError(
        `the developer sidebar opens a group with itself: ${repeating.join(', ')}`,
      );
    }

    return sidebar;
  }

  /**
   * The page type a chapter's opening comment declares.
   *
   * @throws {TypeError} for a chapter that declares none, so a new chapter cannot go out untyped.
   */
  public pageType(path: string, page: ChapterPage): PageType {
    if (page.type === undefined) {
      throw new TypeError(
        `${this.source.book}/${path} has no page type: open it with a comment whose <!-- and --> stand on lines of their own around type: and description: lines, as enshwick's CONTRIBUTING.md shows`,
      );
    }

    return page.type;
  }

  private async buildVersion(
    version: DeveloperVersion,
    prefix: string,
  ): Promise<{ version: DeveloperVersion; entries: SidebarEntry[]; release: PlatformRelease }> {
    const checkout = await GitSource.checkout(this.source.repository, version.ref, [
      `/${this.source.book}/`,
      `/${DeveloperArea.changelog}`,
      `/${CheckedBuilds.reports}/`,
      `/${DeveloperArea.apiManifest}`,
      `/${DeveloperArea.apiRoot}`,
      `/${DeveloperArea.workspaceManifest}`,
      `/${ErrorPages.source}`,
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
        {
          title: page.title,
          description: DeveloperArea.changelogDescription,
          type: 'reference',
          editUrl: false,
        },
        page.mdx ? MdxBody.of(page.body) : page.body,
        await checkout.lastChanged(DeveloperArea.changelog),
        page.mdx,
      ).write();
      sidebar.push({ slug, label: page.title });
    }

    return {
      version,
      entries: sidebar,
      release: await DeveloperArea.release(version, checkout),
    };
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
            type: this.pageType(chapter.path, page),
            editUrl,
          },
          page.mdx ? MdxBody.of(page.body) : page.body,
          await checkout.lastChanged(`${this.source.book}/${chapter.path}`),
          page.mdx,
        ).write();
      }),
    );

    const order = summary.chapters.map(({ chapter }) => slugOf(chapter.path));

    this.newestPages.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  }

  /** The API version and the newest game build of each side with a compatibility report at the version's ref. */
  private static async release(
    version: DeveloperVersion,
    checkout: GitSource,
  ): Promise<PlatformRelease> {
    const manifest = await checkout.read(DeveloperArea.apiManifest);
    const api =
      manifest === undefined ? undefined : /^version\s*=\s*"([^"]+)"/mu.exec(manifest)?.[1];
    const lib = await checkout.read(DeveloperArea.apiRoot);

    return {
      name: version.name,
      ref: version.ref.toString(),
      api,
      checked: await CheckedBuilds.of(checkout),
      lib,
      abi: await DeveloperArea.abi(checkout, lib ?? ''),
      errors: await ErrorPages.locate(checkout),
    };
  }

  /** The ABI module's text, wherever the version keeps it: in the API crate or the internal crate it re-exports. */
  private static async abi(checkout: GitSource, lib: string): Promise<string | undefined> {
    const workspace = await checkout.read(DeveloperArea.workspaceManifest);
    const path = ModuleFile.path(lib, workspace, DeveloperArea.abiModule);

    if (path === undefined) {
      return undefined;
    }

    await checkout.widen([`/${path}`]);

    return checkout.read(path);
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
