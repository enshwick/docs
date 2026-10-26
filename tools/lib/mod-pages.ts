import { cp, mkdir } from 'node:fs/promises';

import { languages } from '../../src/site/languages.ts';
import { texts } from '../../src/site/texts.ts';
import { GitRef, type LanguageCode, type RepositoryName } from '../../src/site/types.ts';
import { Fields } from './fields.ts';
import { GitSource } from './git-source.ts';
import { PageFile } from './page-file.ts';
import { type PlayerPageData, PlayerPageSource } from './player-page-source.ts';

/** What the compatibility page needs to know of one mod at its released ref. */
export interface ModRelease {
  readonly slug: string;
  readonly name: string;
  readonly repository: RepositoryName;
  readonly tag: GitRef;
  readonly version: string | undefined;
  readonly api: string | undefined;
  readonly needs: string | undefined;
  readonly page: boolean;
}

/** The player area's mod pages, each from its repository's newest release, in every language it has. */
export class ModPages {
  public static readonly folder = 'mods';
  private static readonly docs = 'docs';
  private static readonly page = 'player';
  private static readonly manifest = 'Cargo.toml';
  private static readonly api = 'enshwick';
  private static readonly repositoryPrefix = /^mod-/u;

  public constructor(private readonly repositories: readonly RepositoryName[]) {}

  /** Writes every mod's pages and returns what each release says about itself, in list order. */
  public async build(): Promise<ModRelease[]> {
    const releases = await Promise.all(
      this.repositories.map((repository) => this.buildMod(repository)),
    );

    return releases.filter((release): release is ModRelease => release !== undefined);
  }

  /** The newest release's tag, prereleases included; `undefined` when the mod has none. */
  public static async newestTag(repository: RepositoryName): Promise<GitRef | undefined> {
    const token = Bun.env['GITHUB_TOKEN'];
    const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=1`, {
      headers: {
        accept: 'application/vnd.github+json',
        ...(token === undefined || token === '' ? {} : { authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`${repository}: listing releases answered ${response.status}`);
    }

    const releases: unknown = await response.json();
    const first: unknown = Array.isArray(releases) ? releases[0] : undefined;

    return typeof first === 'object' &&
      first !== null &&
      'tag_name' in first &&
      typeof first.tag_name === 'string'
      ? new GitRef(first.tag_name)
      : undefined;
  }

  private async buildMod(repository: RepositoryName): Promise<ModRelease | undefined> {
    const tag = await ModPages.newestTag(repository);

    if (tag === undefined) {
      ModPages.note(`${repository} has no release yet; no page`);

      return undefined;
    }

    const checkout = await GitSource.checkout(repository, tag, [
      `/${ModPages.docs}/`,
      `/${ModPages.manifest}`,
    ]);
    const slug = repository.name.replace(ModPages.repositoryPrefix, '');
    const manifest = ModPages.manifestFacts(await checkout.read(ModPages.manifest));
    const file = `${ModPages.page}.md`;
    const rootText = await checkout.read(`${ModPages.docs}/${file}`);

    if (rootText === undefined) {
      ModPages.note(`${repository}@${tag} has no ${ModPages.docs}/${file}; no page`);

      return { slug, name: slug, repository, tag, needs: undefined, page: false, ...manifest };
    }

    const root = PlayerPageSource.parse(`${repository}@${tag} ${ModPages.docs}/${file}`, rootText);
    const release: ModRelease = {
      slug,
      name: root.data.name.toString(),
      repository,
      tag,
      needs: root.data.needs.toString(),
      page: true,
      ...manifest,
    };

    await mkdir(`${PageFile.contentRoot}/${ModPages.folder}`, { recursive: true });
    await cp(checkout.path(ModPages.docs), `${PageFile.contentRoot}/${ModPages.folder}/${slug}`, {
      recursive: true,
      filter: (source) => !source.endsWith('.md'),
    });
    await this.writePage(release, languages.root, root, file);
    await Promise.all(
      languages.others.map((code) => this.writeTranslation(release, checkout, code)),
    );

    return release;
  }

  /** The page in another language, when the mod has its `player.<language>.md`. */
  private async writeTranslation(
    release: ModRelease,
    checkout: GitSource,
    language: LanguageCode,
  ): Promise<void> {
    const file = `${ModPages.page}.${language}.md`;
    const text = await checkout.read(`${ModPages.docs}/${file}`);

    if (text !== undefined) {
      const origin = `${release.repository}@${release.tag} ${ModPages.docs}/${file}`;

      await this.writePage(release, language, PlayerPageSource.parse(origin, text), file);
    }
  }

  private async writePage(
    release: ModRelease,
    language: LanguageCode,
    source: PlayerPageSource,
    file: string,
  ): Promise<void> {
    const folder = language.equals(languages.root)
      ? ModPages.folder
      : `${language}/${ModPages.folder}`;

    await new PageFile(
      `${folder}/${release.slug}`,
      {
        title: source.data.name.toString(),
        description: source.data.summary.toString(),
        type: 'reference',
        editUrl: `${release.repository.url}/edit/main/${ModPages.docs}/${file}`,
      },
      ModPages.body(release, language, source),
    ).write();
  }

  /** The page: a facts table, then the mod's own text with its settings table under its settings heading. */
  public static body(
    release: ModRelease,
    language: LanguageCode,
    source: PlayerPageSource,
  ): string {
    const t = (key: string): string => texts.get(key, language);
    const facts = [
      `| | |`,
      `| --- | --- |`,
      `| ${t('mod.needs')} | ${t(`mod.who.${source.data.needs}`)} |`,
      `| ${t('mod.id')} | \`${source.data.id}\` |`,
      ...(release.version === undefined ? [] : [`| ${t('mod.version')} | ${release.version} |`]),
      `| ${t('mod.source')} | [${release.repository}](${release.repository.url}) |`,
    ].join('\n');
    const body = source.body.replaceAll('](images/', `](./${release.slug}/images/`);
    const table = ModPages.settingsTable(source.data, t);

    if (table === undefined) {
      return `${facts}\n\n${body}`;
    }

    const heading = `## ${t('mod.settings')}`;
    const at = body.split('\n').findIndex((line) => line.trim() === heading);

    if (at === -1) {
      return `${facts}\n\n${body.trimEnd()}\n\n${heading}\n\n${table}\n`;
    }

    const lines = body.split('\n');

    return `${facts}\n\n${[...lines.slice(0, at + 1), '', table, ...lines.slice(at + 1)].join('\n')}`;
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

  /** The mod's version and the API version it asks for, from its Cargo manifest. */
  private static manifestFacts(text: string | undefined): {
    version: string | undefined;
    api: string | undefined;
  } {
    if (text === undefined) {
      return { version: undefined, api: undefined };
    }

    const manifest = new Fields(Bun.TOML.parse(text));
    const dependency = manifest.at('dependencies').at(ModPages.api);

    return {
      version: manifest.at('package').at('version').text(),
      api: dependency.text() ?? dependency.at('version').text(),
    };
  }

  /** Text for a table cell, its pipes escaped. */
  private static cell(text: string): string {
    return text.replaceAll('|', '\\|');
  }

  private static note(line: string): void {
    process.stderr.write(`${line}\n`);
  }
}
