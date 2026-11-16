/**
 * The modules and items the book's stability chapter names unstable, matched against the API
 * crate's paths as the book names them. {@link Coverage} marks its cells by it.
 */
export class UnstableNames {
  private static readonly pathSeparator = '::';
  /** A path part that names a type, from which the book may name an item. */
  private static readonly typeName = /^[A-Z]/u;

  private readonly names: ReadonlySet<string>;

  public constructor(names: readonly string[]) {
    this.names = new Set(names);
  }

  /**
   * Whether a module or item is unstable: it is named so, or a prefix of its path is, read from its
   * start or from its first type, as the book names them: its module in `world::props`, its type in
   * `damage::Damage::scale`, or `Field::MaxStackSize` in `content::changes::Field::MaxStackSize`.
   * A later part, such as the variant `Damage` in `stats::StatGroup::Damage`, starts no match.
   */
  public has(path: string): boolean {
    const parts = path.split(UnstableNames.pathSeparator);
    const type = parts.findIndex((part) => UnstableNames.typeName.test(part));
    const starts = type > 0 ? [0, type] : [0];

    return starts.some((start) =>
      parts.some(
        (_, end) =>
          end >= start &&
          this.names.has(parts.slice(start, end + 1).join(UnstableNames.pathSeparator)),
      ),
    );
  }
}
