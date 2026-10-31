import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { GitRef, RepositoryName } from '../../src/site/types.ts';
import { GitHistory } from './git-history.ts';

/** Files of one repository at one ref, checked out sparsely into the build cache. */
export class GitSource {
  private static readonly cacheRoot = '.cache/sources';

  private constructor(
    public readonly repository: RepositoryName,
    public readonly ref: GitRef,
    public readonly root: string,
  ) {}

  /**
   * Checks out only `paths` of the repository at `ref`; a fresh copy every time, since refs move. The
   * history comes along without file contents, so each file can be dated by its own last commit.
   */
  public static async checkout(
    repository: RepositoryName,
    ref: GitRef,
    paths: readonly string[],
  ): Promise<GitSource> {
    const root = join(
      GitSource.cacheRoot,
      `${repository.toString().replace('/', '--')}@${ref.toString().replaceAll('/', '--')}`,
    );

    await rm(root, { recursive: true, force: true });
    await GitSource.git([
      '-c',
      'advice.detachedHead=false',
      'clone',
      '--quiet',
      '--single-branch',
      '--filter=blob:none',
      '--sparse',
      `--branch=${ref}`,
      `${repository.url}.git`,
      root,
    ]);
    await GitSource.git(['-C', root, 'sparse-checkout', 'set', '--no-cone', ...paths]);

    return new GitSource(repository, ref, root);
  }

  /** Checks out `paths` too, beside what the checkout already holds. */
  public async widen(paths: readonly string[]): Promise<void> {
    await GitSource.git(['-C', this.root, 'sparse-checkout', 'add', ...paths]);
  }

  /** The path of a file of the checkout. */
  public path(relative: string): string {
    return join(this.root, relative);
  }

  /** The date of the last commit at the ref that changed a file, or `undefined` when none did. */
  public lastChanged(relative: string): Promise<Date | undefined> {
    return new GitHistory(this.root).lastChanged(relative);
  }

  /** A file's text, or `undefined` when the ref has no such file. */
  public async read(relative: string): Promise<string | undefined> {
    const file = Bun.file(this.path(relative));

    return (await file.exists()) ? file.text() : undefined;
  }

  private static async git(args: readonly string[]): Promise<void> {
    const child = Bun.spawn(['git', ...args], { stdout: 'inherit', stderr: 'inherit' });
    const code = await child.exited;

    if (code !== 0) {
      throw new Error(`git ${args.join(' ')} exited with ${code}`);
    }
  }
}
