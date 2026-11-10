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

  /**
   * The root file of module `name`, found through the crate root `lib` and the workspace `Cargo.toml`,
   * or `undefined` when the module comes from a crate the workspace gives no path.
   */
  public static path(lib: string, workspace: string | undefined, name: string): string | undefined {
    const crate = ApiMap.origin(lib, name);

    if (crate === undefined) {
      return `${ModuleFile.apiSource}/${name}${ModuleFile.extension}`;
    }

    const directory = new Fields(workspace === undefined ? undefined : Bun.TOML.parse(workspace))
      .at('workspace')
      .at('dependencies')
      .at(crate.replaceAll(ModuleFile.pathSeparator, ModuleFile.packageSeparator))
      .at('path')
      .text();

    return directory === undefined
      ? undefined
      : `${directory}/${ModuleFile.source}/${name}${ModuleFile.extension}`;
  }
}
