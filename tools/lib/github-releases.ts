import { AnyBoolean, AnyString, n } from '@horizon-republic/nominal-types';

import { GitRef, type RepositoryName } from '../../src/site/types.ts';

/** One release as GitHub's releases API lists it, only what the site reads. */
const GitHubRelease = n.object({
  tag_name: GitRef,
  draft: AnyBoolean,
  prerelease: AnyBoolean,
  assets: n.object({ name: AnyString }).array(),
});

/** A repository's releases on GitHub, and which of them the site downloads each archive from. */
export class GitHubReleases {
  private static readonly perPage = 100;
  private static readonly archive = '.zip';
  /** A release tag that names a version, `v1.0.0-alpha.12` or `enshwick-game-rates-v0.3.0`. */
  private static readonly versioned = /(?:^|-)v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

  /** Every release of the repository, newest first, as GitHub lists them page by page. */
  public static async list(repository: RepositoryName, page = 1): Promise<unknown[]> {
    const token = Bun.env['GITHUB_TOKEN'];
    const response = await fetch(
      `https://api.github.com/repos/${repository}/releases?per_page=${GitHubReleases.perPage}&page=${page}`,
      {
        headers: {
          accept: 'application/vnd.github+json',
          ...(token === undefined || token === '' ? {} : { authorization: `Bearer ${token}` }),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`${repository}: listing releases answered ${response.status}`);
    }

    const json: unknown = await response.json();

    if (!Array.isArray(json)) {
      throw new TypeError(`${repository}: listing releases answered no list`);
    }

    const batch = json.map((release: unknown) => release);

    return batch.length < GitHubReleases.perPage
      ? batch
      : [...batch, ...(await GitHubReleases.list(repository, page + 1))];
  }

  /**
   * Per package, the tag of the newest release that carries its own archive `<package>.zip`: a
   * regular release first, then a prerelease whose tag names a version, such as an alpha, and a
   * rolling prerelease such as `dev` last. Drafts are left out. A package without one has no entry.
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

    const rank = (release: (typeof parsed.value)[number]): number => {
      if (!release.prerelease.value) {
        return 0;
      }

      return GitHubReleases.versioned.test(release.tag_name.toString()) ? 1 : 2;
    };

    const published = parsed.value
      .filter((release) => !release.draft.value)
      .toSorted((a, b) => rank(a) - rank(b));

    return new Map(
      packages.flatMap((name) => {
        const archive = `${name}${GitHubReleases.archive}`;
        const release = published.find((candidate) =>
          candidate.assets.some((asset) => asset.name.toString() === archive),
        );

        return release === undefined ? [] : [[name, release.tag_name] as const];
      }),
    );
  }
}
