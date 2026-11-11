/** The history of a git checkout, read for the date each file last changed. */
export class GitHistory {
  public constructor(private readonly root: string) {}

  /**
   * The committer date of the newest commit at `HEAD` that touched `path`, the real "last updated"
   * date of a page made from it; `undefined` when no commit did. A commit that only moved the file
   * does not count: exact renames are followed, which a checkout without blobs can tell by hash.
   *
   * @throws {Error} when git fails, such as when the root is no repository.
   */
  public async lastChanged(path: string): Promise<Date | undefined> {
    const child = Bun.spawn(
      [
        'git',
        '-C',
        this.root,
        'log',
        '-1',
        '--follow',
        '--find-renames=100%',
        '--diff-filter=AM',
        '--format=%cI',
        'HEAD',
        '--',
        path,
      ],
      { stdout: 'pipe', stderr: 'inherit' },
    );
    const [text, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);

    if (code !== 0) {
      throw new Error(`git log in ${this.root} for ${path} exited with ${code}`);
    }

    const line = text.trim();

    return line === '' ? undefined : new Date(line);
  }
}
