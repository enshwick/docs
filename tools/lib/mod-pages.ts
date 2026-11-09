import { cp, mkdir } from 'node:fs/promises';
import { posix } from 'node:path';

import siteData from '../../src/data/site.json' with { type: 'json' };
import { Languages } from '../../src/site/languages.ts';
import { ModCard, type ModCardData, modCardSchema } from '../../src/site/mod-card.ts';
import { Texts } from '../../src/site/texts.ts';
import type { GitRef, LanguageCode, RepositoryName } from '../../src/site/types.ts';
import type { GitSource } from './git-source.ts';
import { type ModSource, ModSources } from './mod-sources.ts';
import { PageFile } from './page-file.ts';
import { type PlayerPageData, PlayerPageSource } from './player-page-source.ts';

/** What the compatibility page needs to know of one mod at its released ref. */
export interface ModRelease {
  readonly slug: string;
  readonly name: string;
  readonly repository: RepositoryName;
  /** The mod's folder in its repository. */
  readonly folder: string;
  /** The mod's Cargo package, which names its archive. */
  readonly package: string;
  readonly tag: GitRef;
  readonly version: string | undefined;
  readonly api: string | undefined;
  readonly needs: string | undefined;
  readonly page: boolean;
}

/**
 * The player area's mod pages, one per mod of the mods repository, each read at the release
 * `GitHubReleases.newestArchives` picks for it, in every language it has.
 */
export class ModPages {
  public static readonly folder = 'mods';
  /** Where loops and their posters are served from, beside the pages under the same address. */
  public static readonly publicFolder = `public/${ModPages.folder}`;
  private static readonly images = 'images';
  private static readonly heading = '## ';
  private static readonly file = `${ModSources.docs}/${ModSources.page}.md`;

  private readonly sources: ModSources;

  public constructor(repository: RepositoryName) {
    this.sources = new ModSources(repository);
  }

  /** Writes every mod's pages and returns what each release says about itself, in folder order. */
  public async build(): Promise<ModRelease[]> {
    const mods = await this.sources.list();
    const releases = await Promise.all(mods.map((mod) => this.buildMod(mod)));

    return releases.filter((release): release is ModRelease => release !== undefined);
  }

  private async buildMod(mod: ModSource): Promise<ModRelease | undefined> {
    const { repository } = this.sources;

    if (mod.tag === undefined) {
      ModPages.note(`${repository} has no release of ${mod.package} yet; no page`);

      return undefined;
    }

    const checkout = await this.sources.checkout(mod.tag);
    const known = {
      slug: posix.basename(mod.folder),
      repository,
      folder: mod.folder,
      package: mod.package,
      tag: mod.tag,
      ...ModSources.manifestFacts(
        await checkout.read(`${mod.folder}/${ModSources.manifest}`),
        await checkout.read(ModSources.manifest),
      ),
    };
    const origin = `${repository}@${mod.tag} ${mod.folder}/${ModPages.file}`;
    const rootText = await checkout.read(`${mod.folder}/${ModPages.file}`);

    if (rootText === undefined) {
      ModPages.note(`${origin} is missing; no page`);

      return { ...known, name: known.slug, needs: undefined, page: false };
    }

    const root = PlayerPageSource.parse(origin, rootText);
    const release: ModRelease = {
      ...known,
      name: root.data.name.toString(),
      needs: root.data.needs.toString(),
      page: true,
    };

    await mkdir(`${PageFile.contentRoot}/${ModPages.folder}`, { recursive: true });
    await ModPages.copyImages(checkout, release, ModPages.publicFolder);
    await this.writePage(release, checkout, Languages.site.root, root, ModPages.file);
    await Promise.all(
      Languages.site.others.map((code) => this.writeTranslation(release, checkout, code)),
    );

    return release;
  }

  /** The pictures and loops a page shows, from the mod's `docs/images/`, into `folder/<slug>/images`. */
  private static async copyImages(
    checkout: GitSource,
    release: ModRelease,
    folder: string,
  ): Promise<void> {
    await cp(
      checkout.path(`${release.folder}/${ModSources.docs}/${ModPages.images}`),
      `${folder}/${release.slug}/${ModPages.images}`,
      { recursive: true, force: true },
    ).catch((error: unknown) => {
      // A mod without pictures has no images folder.
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    });
  }

  /** The page in another language, when the mod has its `player.<language>.md`. */
  private async writeTranslation(
    release: ModRelease,
    checkout: GitSource,
    language: LanguageCode,
  ): Promise<void> {
    const file = `${ModSources.docs}/${ModSources.page}.${language}.md`;
    const text = await checkout.read(`${release.folder}/${file}`);

    if (text !== undefined) {
      const origin = `${release.repository}@${release.tag} ${release.folder}/${file}`;

      await this.writePage(release, checkout, language, PlayerPageSource.parse(origin, text), file);
    }
  }

  private async writePage(
    release: ModRelease,
    checkout: GitSource,
    language: LanguageCode,
    source: PlayerPageSource,
    file: string,
  ): Promise<void> {
    const folder = language.equals(Languages.site.root)
      ? ModPages.folder
      : `${language}/${ModPages.folder}`;
    const path = `${release.folder}/${file}`;

    await ModPages.copyImages(checkout, release, `${PageFile.contentRoot}/${folder}`);
    await new PageFile(
      `${folder}/${release.slug}`,
      {
        title: source.data.name.toString(),
        description: source.data.summary.toString(),
        type: 'reference',
        editUrl: `${release.repository.url}/edit/${ModSources.mainBranch}/${path}`,
        mod: ModPages.card(release, source, await ModPages.roadmap(release.slug)),
      },
      ModPages.body(release, language, source),
      await checkout.lastChanged(path),
    ).write();
  }

  /**
   * The site path of the mod's page of aims, committed in the root language under
   * `roadmaps/<slug>.md`, or `undefined` when the mod has none.
   */
  public static async roadmap(slug: string): Promise<string | undefined> {
    const exists = await Bun.file(
      `${PageFile.contentRoot}/${ModCard.roadmaps}/${slug}.md`,
    ).exists();

    return exists ? `/${ModCard.roadmaps}/${slug}/` : undefined;
  }

  /** What the mod card at the head of the page shows, kept in the page's front matter. */
  public static card(release: ModRelease, source: PlayerPageSource, roadmap?: string): ModCardData {
    return modCardSchema.parse({
      id: source.data.id.toString(),
      needs: source.data.needs.toString(),
      repository: release.repository.toString(),
      folder: release.folder,
      package: release.package,
      release: release.tag.toString(),
      ...(release.version === undefined ? {} : { version: release.version }),
      ...(release.api === undefined ? {} : { api: release.api }),
      ...(roadmap === undefined ? {} : { roadmap }),
    });
  }

  /** The page: the mod's own text with its settings table under its settings heading. */
  public static body(
    release: ModRelease,
    language: LanguageCode,
    source: PlayerPageSource,
  ): string {
    const t = (key: string): string => Texts.site.get(key, language);
    const body = ModPages.withMedia(release, source).replaceAll(
      `](${ModPages.images}/`,
      `](./${release.slug}/${ModPages.images}/`,
    );
    const table = ModPages.settingsTable(source.data, t);

    if (table === undefined) {
      return body;
    }

    const heading = `## ${t('mod.settings')}`;
    const at = body.split('\n').findIndex((line) => line.trim() === heading);

    if (at === -1) {
      return `${body.trimEnd()}\n\n${heading}\n\n${table}\n`;
    }

    const lines = body.split('\n');

    return [...lines.slice(0, at + 1), '', table, ...lines.slice(at + 1)].join('\n');
  }

  /**
   * The text with the page's pictures and loops after its opening list. A loop is a video that
   * waits on its poster frame until the reader plays it, and reads from `public/`, where Markdown
   * cannot point.
   */
  private static withMedia(release: ModRelease, source: PlayerPageSource): string {
    const url = (path: string): string =>
      `${siteData.base}/${ModPages.folder}/${release.slug}/${path}`;
    const media = (source.data.screenshots ?? []).map(({ file, alt, poster }) =>
      poster === undefined
        ? `![${alt}](${file})`
        : `<video src="${url(file.toString())}" poster="${url(poster.toString())}" aria-label="${ModPages.attribute(alt.toString())}" controls loop muted playsinline preload="none"></video>`,
    );

    if (media.length === 0) {
      return source.body;
    }

    const lines = source.body.split('\n');
    const at = lines.findIndex((line) => line.startsWith(ModPages.heading));

    if (at === -1) {
      return `${source.body.trimEnd()}\n\n${media.join('\n\n')}\n`;
    }

    return [...lines.slice(0, at), media.join('\n\n'), '', ...lines.slice(at)].join('\n');
  }

  /** Text for a double-quoted HTML attribute. */
  private static attribute(text: string): string {
    return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  }

  private static settingsTable(
    data: PlayerPageData,
    t: (key: string) => string,
  ): string | undefined {
    const settings = data.settings ?? [];

    if (settings.length === 0) {
      return undefined;
    }

    const header = [
      'mod.setting.key',
      'mod.setting.default',
      'mod.setting.range',
      'mod.setting.meaning',
      'mod.setting.applies',
    ]
      .map((key) => t(key))
      .join(' | ');
    const rows = settings.map((setting) =>
      [
        `\`${setting.key}\``,
        `\`${setting.default}\``,
        ModPages.cell(setting.range?.toString() ?? ''),
        ModPages.cell(setting.meaning.toString()),
        t(`mod.applies.${setting.applies}`),
      ].join(' | '),
    );

    return [
      `| ${header} |`,
      '| --- | --- | --- | --- | --- |',
      ...rows.map((row) => `| ${row} |`),
    ].join('\n');
  }

  /** Text for a table cell, its pipes escaped. */
  private static cell(text: string): string {
    return text.replaceAll('|', '\\|');
  }

  private static note(line: string): void {
    process.stderr.write(`${line}\n`);
  }
}
