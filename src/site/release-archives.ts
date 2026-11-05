import { AnyString, n } from '@horizon-republic/nominal-types';

import { GitRef, RepositoryName } from './types.ts';

/**
 * The release each download link of the site points at. Pages link an archive as GitHub's
 * `releases/latest/download/<archive>`, which skips prereleases; the build pins every such link to
 * the release `tools/fetch.ts` picked, so before 1.0 it reaches the newest alpha.
 */
export class ReleaseArchives {
  private static readonly schema = n.record(RepositoryName, n.record(AnyString, GitRef));
  private static readonly latest =
    /^https:\/\/github\.com\/([A-Za-z0-9-]+\/[A-Za-z0-9._-]+)\/releases\/latest\/download\/([^/?#]+)$/u;

  private readonly tags: ReadonlyMap<string, ReadonlyMap<string, string>>;

  /** Takes `src/generated/release-archives.json`, which `tools/fetch.ts` writes before every build. */
  public constructor(data: unknown) {
    const parsed = ReleaseArchives.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/generated/release-archives.json: ${JSON.stringify(parsed.issues)}`);
    }

    this.tags = new Map(
      Object.entries(parsed.value).map(([repository, archives]) => [
        repository,
        new Map(Object.entries(archives).map(([archive, tag]) => [archive, tag.toString()])),
      ]),
    );
  }

  /**
   * The link pinned to the archive's release, or the link itself when it names no newest archive of
   * a repository the site reads releases of.
   *
   * @throws {TypeError} when it names an archive no release of such a repository carries, which
   * would be a dead link.
   */
  public pin(url: string): string {
    const match = ReleaseArchives.latest.exec(url);
    const [, repository = '', archive = ''] = match ?? [];
    const archives = this.tags.get(repository);

    if (match === null || archives === undefined) {
      return url;
    }

    const tag = archives.get(archive);

    if (tag === undefined) {
      throw new TypeError(`${url}: no release of ${repository} carries ${archive}`);
    }

    return `https://github.com/${repository}/releases/download/${tag}/${archive}`;
  }
}
