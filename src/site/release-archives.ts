import { existsSync, readFileSync } from 'node:fs';

import { AnyString, n } from '@horizon-republic/nominal-types';

import { GitRef, RepositoryName } from './types.ts';

/**
 * The release each download link of the site points at. Pages link an archive as GitHub's
 * `releases/latest/download/<archive>`, which skips prereleases; the build pins every such link to
 * the release `tools/fetch.ts` picked, so before 1.0 it reaches the newest alpha.
 */
export class ReleaseArchives {
  /** Where `tools/fetch.ts` writes, per repository, the release tag of each archive. */
  public static readonly file = new URL('../generated/release-archives.json', import.meta.url);

  private static readonly schema = n.record(RepositoryName, n.record(AnyString, GitRef));
  private static readonly latest =
    /^https:\/\/github\.com\/([A-Za-z0-9-]+\/[A-Za-z0-9._-]+)\/releases\/latest\/download\/([^/?#]+)$/u;

  /** The tags `tools/fetch.ts` wrote, or none before it ran, which leaves every link as written. */
  public static readonly site = new ReleaseArchives(
    existsSync(ReleaseArchives.file)
      ? JSON.parse(readFileSync(ReleaseArchives.file, 'utf8'))
      : undefined,
  );

  private readonly tags: ReadonlyMap<string, ReadonlyMap<string, string>> | undefined;

  public constructor(data: unknown) {
    if (data === undefined) {
      this.tags = undefined;

      return;
    }

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
   * The link pinned to the archive's release, or the link itself when it names no newest archive.
   *
   * @throws {TypeError} when it names an archive no release carries, which would be a dead link.
   */
  public pin(url: string): string {
    const match = ReleaseArchives.latest.exec(url);

    if (match === null || this.tags === undefined) {
      return url;
    }

    const [, repository = '', archive = ''] = match;
    const tag = this.tags.get(repository)?.get(archive);

    if (tag === undefined) {
      throw new TypeError(`${url}: no release of ${repository} carries ${archive}`);
    }

    return `https://github.com/${repository}/releases/download/${tag}/${archive}`;
  }
}
