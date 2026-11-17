/**
 * The public modules and paths of the API crate as `tools/fetch.ts` reads them, which a covered
 * cell of the coverage table must name. Paths left out leave items unchecked.
 */
export class ApiSurface {
  /** What joins the parts of a crate path. */
  public static readonly pathSeparator = '::';

  private readonly modules: ReadonlySet<string>;
  private readonly paths: ReadonlySet<string> | undefined;

  public constructor(modules: readonly string[], paths?: readonly string[]) {
    this.modules = new Set(modules);
    this.paths = paths === undefined ? undefined : new Set(paths);
  }

  /** Whether the crate has the public module `name`, by its paths where they were read. */
  public hasModule(name: string): boolean {
    return (this.paths ?? this.modules).has(name);
  }

  /**
   * The crate path `item` names, read from the crate root and else from `module`, or `undefined`
   * when the crate has neither; `item` as it is when no paths were read.
   */
  public pathOf(module: string, item: string): string | undefined {
    const inModule = `${module}${ApiSurface.pathSeparator}${item}`;

    if (this.paths === undefined || this.paths.has(item)) {
      return item;
    }

    return this.paths.has(inModule) ? inModule : undefined;
  }
}
