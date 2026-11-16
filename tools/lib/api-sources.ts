import { Fields } from './fields.ts';
import type { GitSource } from './git-source.ts';

/**
 * The Rust source of the `enshwick` crate and of every internal crate it depends on, directly or
 * through another, read from a sparse checkout of the platform repository for {@link ApiItems}.
 */
export class ApiSources {
  /** The API crate's name, which also starts the name of every internal crate. */
  public static readonly crateName = 'enshwick';
  private static readonly crateFolder = 'crates/enshwick';
  private static readonly manifest = 'Cargo.toml';
  private static readonly source = 'src';
  private static readonly sourceGlob = 'src/**/*.rs';
  /** A crate's name in Rust paths uses `_` where its package name uses `-`. */
  private static readonly packageSeparator = '-';
  private static readonly crateSeparator = '_';
  private static readonly parentFolder = '..';
  private static readonly thisFolder = '.';

  /**
   * Each crate's `src/` files by their path below `src/`, by crate name (`enshwick_base`), from
   * `checkout` and its workspace manifest `workspace`, checking the files out first.
   */
  public static async read(
    checkout: GitSource,
    workspace: string | undefined,
  ): Promise<Map<string, Map<string, string>>> {
    const shared = new Fields(workspace === undefined ? undefined : Bun.TOML.parse(workspace))
      .at('workspace')
      .at('dependencies');
    const folders = await ApiSources.folders(
      checkout,
      shared,
      new Map([[ApiSources.crateName, ApiSources.crateFolder]]),
      [ApiSources.crateFolder],
    );

    await checkout.widen([...folders.values()].map((folder) => `/${folder}/${ApiSources.source}/`));

    const crates = await Promise.all(
      [...folders].map(
        async ([crate, folder]) => [crate, await ApiSources.files(checkout, folder)] as const,
      ),
    );

    return new Map(crates);
  }

  /**
   * The folders of `known` crates and of every `enshwick` crate those in `next` depend on, by
   * crate name, a dependency's own `path` read from its dependent's folder and else from `shared`.
   */
  private static async folders(
    checkout: GitSource,
    shared: Fields,
    known: Map<string, string>,
    next: readonly string[],
  ): Promise<Map<string, string>> {
    if (next.length === 0) {
      return known;
    }

    await checkout.widen(next.map((folder) => `/${folder}/${ApiSources.manifest}`));
    const manifests = await Promise.all(
      next.map(async (folder) => ({
        folder,
        text: await checkout.read(`${folder}/${ApiSources.manifest}`),
      })),
    );
    const found: string[] = [];

    for (const { folder, text } of manifests) {
      const dependencies = new Fields(text === undefined ? undefined : Bun.TOML.parse(text)).at(
        'dependencies',
      );

      for (const name of ApiSources.keys(dependencies.value)) {
        const crate = name.replaceAll(ApiSources.packageSeparator, ApiSources.crateSeparator);
        const own = dependencies.at(name).at('path').text();
        const path = own === undefined ? shared.at(name).at('path').text() : `${folder}/${own}`;

        if (name.startsWith(ApiSources.crateName) && !known.has(crate) && path !== undefined) {
          known.set(crate, ApiSources.normal(path));
          found.push(ApiSources.normal(path));
        }
      }
    }

    return ApiSources.folders(checkout, shared, known, found);
  }

  /** The `.rs` files of the crate in `folder`, by their path below its `src/`. */
  private static async files(checkout: GitSource, folder: string): Promise<Map<string, string>> {
    const paths = await checkout.glob(`${folder}/${ApiSources.sourceGlob}`);
    const texts = await Promise.all(paths.map((path) => checkout.read(path)));
    const below = folder.length + ApiSources.source.length + 2;

    return new Map(
      paths.flatMap((path, at) => {
        const text = texts[at];

        return text === undefined ? [] : [[path.slice(below), text] as const];
      }),
    );
  }

  /** The keys of a decoded TOML table, none for anything else. */
  private static keys(value: unknown): string[] {
    return typeof value === 'object' && value !== null ? Object.keys(value) : [];
  }

  /** A `/`-separated path with its `..` and `.` folded, as a dependency's relative path needs. */
  private static normal(path: string): string {
    const parts: string[] = [];

    for (const part of path.split('/')) {
      if (part === ApiSources.parentFolder) {
        parts.pop();
      } else if (part !== ApiSources.thisFolder && part !== '') {
        parts.push(part);
      }
    }

    return parts.join('/');
  }
}
