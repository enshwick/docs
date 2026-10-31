import { cp, mkdir } from 'node:fs/promises';
import { posix } from 'node:path';

import { Languages } from '../../src/site/languages.ts';
import { type ModCardData, modCardSchema } from '../../src/site/mod-card.ts';
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
 * `ModSources.newestArchives` picks for it, in every language it has.
 */
export class ModPages {
  public static readonly folder = 'mods';
  private static readonly images = 'images';
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
    await ModPages.copyImages(checkout, release);
    await this.writePage(release, checkout, Languages.site.root, root, ModPages.file);
    await Promise.all(
      Languages.site.others.map((code) => this.writeTranslation(release, checkout, code)),
    );

    return release;
  }

  /** The pictures a page shows, from the mod's `docs/images/`, beside the generated page. */
  private static async copyImages(checkout: GitSource, release: ModRelease): Promise<void> {
    await cp(
      checkout.path(`${release.folder}/${ModSources.docs}/${ModPages.images}`),
      `${PageFile.contentRoot}/${ModPages.folder}/${release.slug}/${ModPages.images}`,
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

    await new PageFile(
      `${folder}/${release.slug}`,
      {
        title: source.data.name.toString(),
        description: source.data.summary.toString(),
        type: 'reference',
        editUrl: `${release.repository.url}/edit/${ModSources.mainBranch}/${path}`,
        mod: ModPages.card(release, source),
      },
      ModPages.body(release, language, source),
      await checkout.lastChanged(path),
    ).write();
  }

  /** What the mod card at the head of the page shows, kept in the page's front matter. */
  public static card(release: ModRelease, source: PlayerPageSource): ModCardData {
    return modCardSchema.parse({
      id: source.data.id.toString(),
      needs: source.data.needs.toString(),
      repository: release.repository.toString(),
      folder: release.folder,
      package: release.package,
      release: release.tag.toString(),
      ...(release.version === undefined ? {} : { version: release.version }),
      ...(release.api === undefined ? {} : { api: release.api }),
    });
  }

  /** The page: the mod's own text with its settings table under its settings heading. */
  public static body(
    release: ModRelease,
    language: LanguageCode,
    source: PlayerPageSource,
  ): string {
    const t = (key: string): string => Texts.site.get(key, language);
    const body = source.body.replaceAll(
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
