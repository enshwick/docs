import { ApiMap } from './api-map.ts';
import { Fields } from './fields.ts';

/** Where a public module of the API crate keeps its source: in the API crate, or in the internal crate it re-exports. */
export class ModuleFile {
  private static readonly apiSource = 'crates/enshwick/src';
  private static readonly source = 'src';
  private static readonly extension = '.rs';
  /** A crate's name in Rust paths uses `_` where its package name uses `-`. */
  private static readonly pathSeparator = '_';
  private static readonly packageSeparator = '-';
  private static readonly workspaceKey = 'workspace';
  private static readonly dependenciesKey = 'dependencies';
  private static readonly pathKey = 'path';

  /** A crate's name in Rust paths, `enshwick_base`, from its package name, `enshwick-base`. */
  public static crateOf(packageName: string): string {
    return packageName.replaceAll(ModuleFile.packageSeparator, ModuleFile.pathSeparator);
  }

  /** The `path` a manifest's `[dependencies]`, or its `[workspace.dependencies]` with `inWorkspace`, gives a package. */
  public static dependencyPath(
    manifest: Fields,
    packageName: string,
    inWorkspace = false,
  ): string | undefined {
    const table = inWorkspace ? manifest.at(ModuleFile.workspaceKey) : manifest;

    return table.at(ModuleFile.dependenciesKey).at(packageName).at(ModuleFile.pathKey).text();
  }

  /** The package names a manifest's `[dependencies]` lists. */
  public static dependencies(manifest: Fields): string[] {
    const table: unknown = manifest.at(ModuleFile.dependenciesKey).value;

    return typeof table === 'object' && table !== null ? Object.keys(table) : [];
  }

  /**
   * The root file of module `name`, found through the crate root `lib` and the workspace `Cargo.toml`,
   * or `undefined` when the module comes from a crate the workspace gives no path.
   */
  public static path(lib: string, workspace: string | undefined, name: string): string | undefined {
    const crate = ApiMap.origin(lib, name);

    if (crate === undefined) {
      return `${ModuleFile.apiSource}/${name}${ModuleFile.extension}`;
    }

    const directory = ModuleFile.dependencyPath(
      new Fields(workspace === undefined ? undefined : Bun.TOML.parse(workspace)),
      crate.replaceAll(ModuleFile.pathSeparator, ModuleFile.packageSeparator),
      true,
    );

    return directory === undefined
      ? undefined
      : `${directory}/${ModuleFile.source}/${name}${ModuleFile.extension}`;
  }
}
