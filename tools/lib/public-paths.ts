import type { GitRef } from '../../src/site/types.ts';

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
  /** A Rust path of plain or raw (`r#type`) names. */
  private static readonly path =
    /^(?:r#)?[A-Za-z_][A-Za-z0-9_]*(?:::(?:r#)?[A-Za-z_][A-Za-z0-9_]*)*$/u;

  /**
   * The paths of the list `text` read at `ref`, sorted.
   *
   * @throws {Error} When `ref` has no list, so the coverage table is never checked against none.
   * @throws {TypeError} When a line is not one path, with ` unstable` after it or not, or repeats one.
   */
  public static parse(text: string | undefined, ref: GitRef): ApiPaths {
    if (text === undefined) {
      throw new Error(`${ref} has no ${PublicPaths.file}`);
    }

    const all = new Set<string>();
    const unstable: string[] = [];

    for (const line of text.split(/\r?\n/u)) {
      if (line === '' || line.startsWith(PublicPaths.comment)) {
        continue;
      }

      const gated = line.endsWith(PublicPaths.unstableMark);
      const path = gated ? line.slice(0, -PublicPaths.unstableMark.length) : line;

      if (!PublicPaths.path.test(path)) {
        throw new TypeError(`${PublicPaths.file}: not a path: ${line}`);
      }

      if (all.has(path)) {
        throw new TypeError(`${PublicPaths.file}: listed twice: ${path}`);
      }

      all.add(path);

      if (gated) {
        unstable.push(path);
      }
    }

    return { all: [...all].toSorted(), unstable: unstable.toSorted() };
  }
}
