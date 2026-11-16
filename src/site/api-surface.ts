/**
 * The public modules and paths of the API crate as `tools/fetch.ts` reads them, which a covered
 * cell of the coverage table must name. Paths left out leave items unchecked.
 */
export class ApiSurface {
  private static readonly pathSeparator = '::';

  private readonly modules: ReadonlySet<string>;
  private readonly paths: ReadonlySet<string> | undefined;

  public constructor(modules: readonly string[], paths?: readonly string[]) {
    this.modules = new Set(modules);
    this.paths = paths === undefined ? undefined : new Set(paths);
  }

  /** Whether the crate has the public module `name`. */
  public hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * The first of `items` the crate lacks, each read as a path from the crate root or from
   * `module`, or `undefined` when it has them all.
   */
  public missingItem(module: string, items: readonly string[]): string | undefined {
    const paths = this.paths;

    return paths === undefined
      ? undefined
      : items.find(
          (item) => !paths.has(item) && !paths.has(`${module}${ApiSurface.pathSeparator}${item}`),
        );
  }
}
