/** The public paths of the API crate, and those of them only its `unstable` feature compiles. */
export interface ApiPaths {
  readonly all: readonly string[];
  readonly unstable: readonly string[];
}

/**
 * The list of the API crate's public paths that the platform commits in its tools folder,
 * written from the compiler's view of the crate. The coverage table names its items by these paths,
 * so the build refuses one the crate lacks.
 */
export class PublicPaths {
  /** The list in the platform repository. */
  public static readonly file = 'tools/public-paths.txt';

  private static readonly comment = '#';
  private static readonly unstableMark = ' unstable';

  /**
   * The paths of the list's text, sorted.
   *
   * @throws {TypeError} When a line is not one path, with ` unstable` after it or not.
   */
  public static parse(text: string): ApiPaths {
    const all: string[] = [];
    const unstable: string[] = [];

    for (const line of text.split(/\r?\n/u)) {
      if (line === '' || line.startsWith(PublicPaths.comment)) {
        continue;
      }

      const gated = line.endsWith(PublicPaths.unstableMark);
      const path = gated ? line.slice(0, -PublicPaths.unstableMark.length) : line;

      if (/\s/u.test(path) || path === '') {
        throw new TypeError(`${PublicPaths.file}: not a path: ${line}`);
      }

      all.push(path);

      if (gated) {
        unstable.push(path);
      }
    }

    return { all: all.toSorted(), unstable: unstable.toSorted() };
  }
}
