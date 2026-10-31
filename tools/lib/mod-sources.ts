import { posix } from 'node:path';

import { AnyBoolean, AnyString, n } from '@horizon-republic/nominal-types';

import { GitRef, type RepositoryName } from '../../src/site/types.ts';
import { Fields } from './fields.ts';
import { GitSource } from './git-source.ts';

/** One of our mods: its Cargo package, its folder in the mods repository and its newest release. */
export interface ModSource {
  readonly package: string;
  readonly folder: string;
  /** The release the site reads the mod at (see `ModSources.newestArchives`); `undefined` before its first. */
  readonly tag: GitRef | undefined;
}

/** A Cargo workspace manifest, only the members the site reads. */
const WorkspaceManifest = n.object({
  workspace: n.object({ members: n.of(AnyString).array({ min: 1 }) }),
});

/** One release as GitHub's releases API lists it, only what the site reads. */
const GitHubRelease = n.object({
  tag_name: GitRef,
  draft: AnyBoolean,
  prerelease: AnyBoolean,
  assets: n.object({ name: AnyString }).array(),
});

/** Where each of our mods lives in the mods repository and which release the site reads it at. */
export class ModSources {
  public static readonly manifest = 'Cargo.toml';
  public static readonly docs = 'docs';
  public static readonly page = 'player';
  public static readonly mainBranch = new GitRef('main');
  private static readonly api = 'enshwick';
  private static readonly archive = '.zip';
  private static readonly releasesPerPage = 100;

  /** One checkout per release tag, shared by every mod that tag releases. */
  private readonly checkouts = new Map<string, Promise<GitSource>>();

  private mods: readonly ModSource[] = [];

  public constructor(public readonly repository: RepositoryName) {}

  /**
   * Our mods, in folder order: the members of the repository's Cargo workspace on `main` that have
   * a player page, each with its newest release.
   */
  public async list(): Promise<readonly ModSource[]> {
    const found = await this.members();
    const tags = ModSources.newestArchives(
      `${this.repository} releases`,
      await this.releases(),
      found.map((mod) => mod.package),
    );

    this.mods = found.map(({ package: name, folder }) => ({
      package: name,
      folder,
      tag: tags.get(name),
    }));

    return this.mods;
  }

  /** The checkout at a release tag with every mod's docs and manifest, made once per tag. */
  public checkout(tag: GitRef): Promise<GitSource> {
    const known = this.checkouts.get(tag.toString());

    if (known !== undefined) {
      return known;
    }

    const checkout = GitSource.checkout(this.repository, tag, [
      `/${ModSources.manifest}`,
      ...this.mods.flatMap((mod) => [
        `/${mod.folder}/${ModSources.manifest}`,
        `/${mod.folder}/${ModSources.docs}/`,
      ]),
    ]);

    this.checkouts.set(tag.toString(), checkout);

    return checkout;
  }

  /**
   * The member folders a Cargo workspace manifest names, globs as written.
   *
   * @throws {TypeError} when the manifest is missing or names no members, since the site would lose
   *   every mod page.
   */
  public static workspaceMembers(origin: string, text?: string): string[] {
    if (text === undefined) {
      throw new TypeError(`${origin} is missing`);
    }

    const parsed = WorkspaceManifest.parse(Bun.TOML.parse(text));

    if (!parsed.ok) {
      throw new TypeError(`${origin}: ${JSON.stringify(parsed.issues)}`);
    }

    return parsed.value.workspace.members.map((member) => member.toString());
  }

  /**
   * Per package, the tag of the newest regular release that carries its own archive
   * `<package>.zip`, else of the newest prerelease that does, such as the rolling `dev` build.
   * Drafts are left out. A package without one has no entry.
   *
   * @throws {TypeError} when the list does not read as GitHub's releases, newest first.
   */
  public static newestArchives(
    origin: string,
    releases: unknown,
    packages: readonly string[],
  ): Map<string, GitRef> {
    const parsed = GitHubRelease.array().parse(releases);

    if (!parsed.ok) {
      throw new TypeError(`${origin}: ${JSON.stringify(parsed.issues)}`);
    }

    const published = parsed.value
      .filter((release) => !release.draft.value)
      .toSorted((a, b) => Number(a.prerelease.value) - Number(b.prerelease.value));

    return new Map(
      packages.flatMap((name) => {
        const archive = `${name}${ModSources.archive}`;
        const release = published.find((candidate) =>
          candidate.assets.some((asset) => asset.name.toString() === archive),
        );

        return release === undefined ? [] : [[name, release.tag_name] as const];
      }),
    );
  }

  /**
   * The mod's version and the API version it asks for, from its Cargo manifest, or from the
   * workspace manifest where a field says `workspace = true`.
   */
  public static manifestFacts(
    text: string | undefined,
    workspaceText: string | undefined,
  ): { version: string | undefined; api: string | undefined } {
    if (text === undefined) {
      return { version: undefined, api: undefined };
    }

    const manifest = new Fields(Bun.TOML.parse(text));
    const workspace = new Fields(
      workspaceText === undefined ? undefined : Bun.TOML.parse(workspaceText),
    ).at('workspace');
    const version = ModSources.inherited(
      manifest.at('package').at('version'),
      workspace.at('package').at('version'),
    );
    const dependency = ModSources.inherited(
      manifest.at('dependencies').at(ModSources.api),
      workspace.at('dependencies').at(ModSources.api),
    );

    return {
      version: version.text(),
      api: dependency.text() ?? dependency.at('version').text(),
    };
  }

  /** The workspace members on `main` with a player page, each by its package and folder. */
  private async members(): Promise<Array<Omit<ModSource, 'tag'>>> {
    const checkout = await GitSource.checkout(this.repository, ModSources.mainBranch, [
      `/${ModSources.manifest}`,
    ]);
    const members = ModSources.workspaceMembers(
      `${this.repository}@${ModSources.mainBranch} ${ModSources.manifest}`,
      await checkout.read(ModSources.manifest),
    );

    await checkout.widen(
      members.flatMap((member) => [
        `/${member}/${ModSources.manifest}`,
        `/${member}/${ModSources.docs}/${ModSources.page}.md`,
      ]),
    );

    const manifests = await Promise.all(
      members.map((member) =>
        Array.fromAsync(new Bun.Glob(`${member}/${ModSources.manifest}`).scan(checkout.root)),
      ),
    );
    const folders = manifests
      .flat()
      .map((path) => posix.dirname(path))
      .toSorted();
    const found = await Promise.all(
      folders.map(async (folder) => {
        const manifest = await checkout.read(`${folder}/${ModSources.manifest}`);
        const name = new Fields(manifest === undefined ? undefined : Bun.TOML.parse(manifest))
          .at('package')
          .at('name')
          .text();
        const page = await checkout.read(`${folder}/${ModSources.docs}/${ModSources.page}.md`);

        return name === undefined || page === undefined ? [] : [{ package: name, folder }];
      }),
    );

    return found.flat();
  }

  /** Every release of the repository, newest first, as GitHub lists them page by page. */
  private async releases(page = 1): Promise<unknown[]> {
    const token = Bun.env['GITHUB_TOKEN'];
    const response = await fetch(
      `https://api.github.com/repos/${this.repository}/releases?per_page=${ModSources.releasesPerPage}&page=${page}`,
      {
        headers: {
          accept: 'application/vnd.github+json',
          ...(token === undefined || token === '' ? {} : { authorization: `Bearer ${token}` }),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`${this.repository}: listing releases answered ${response.status}`);
    }

    const json: unknown = await response.json();

    if (!Array.isArray(json)) {
      throw new TypeError(`${this.repository}: listing releases answered no list`);
    }

    const batch = json.map((release: unknown) => release);

    return batch.length < ModSources.releasesPerPage
      ? batch
      : [...batch, ...(await this.releases(page + 1))];
  }

  /** A manifest field, or the workspace's field where it says `workspace = true`. */
  private static inherited(own: Fields, workspace: Fields): Fields {
    return own.at('workspace').value === true ? workspace : own;
  }
}
