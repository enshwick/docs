import type { Node } from 'web-tree-sitter';

/**
 * What a `#[cfg(…)]` attribute says about a build, read from tree-sitter's Rust syntax nodes: whether
 * only a test build compiles the item, or only one with the `unstable` feature. {@link RustCrate}
 * reads each item's attributes through it.
 */
export class RustCfg {
  private static readonly cfg = 'cfg';
  private static readonly argumentsField = 'arguments';
  private static readonly tokenTree = 'token_tree';
  private static readonly listSeparator = ',';
  /** The `cfg` options only a test build sets. */
  private static readonly testOptions = ['test', 'doctest'];
  private static readonly featureOption = 'feature';
  /** The Cargo feature whose items keep no SemVer promise, as a `cfg` names it. */
  private static readonly unstableFeature = '"unstable"';
  private static readonly equals = '=';
  private static readonly allOf = 'all';
  private static readonly anyOf = 'any';

  /**
   * Whether an `attribute_item` is a `cfg` that only a test build meets: `cfg(test)`, an `all` with
   * such an option, or an `any` of nothing else. `cfg(not(test))` and `cfg(any(test, feature = …))`
   * are not.
   */
  public static isTestOnly(attributeItem: Node): boolean {
    return RustCfg.needsOption(attributeItem, (option) => {
      const [name, ...rest] = option;

      return rest.length === 0 && RustCfg.testOptions.includes(name?.text ?? '');
    });
  }

  /** Whether an `attribute_item` is a `cfg` that only a build with the `unstable` feature meets. */
  public static isUnstable(attributeItem: Node): boolean {
    return RustCfg.needsOption(attributeItem, (option) => {
      const [name, equals, value, ...rest] = option;

      return (
        rest.length === 0 &&
        name?.text === RustCfg.featureOption &&
        equals?.type === RustCfg.equals &&
        value?.text === RustCfg.unstableFeature
      );
    });
  }

  /** Whether an `attribute_item` is a `cfg` whose predicate holds only where `option` does. */
  private static needsOption(
    attributeItem: Node,
    option: (tokens: readonly Node[]) => boolean,
  ): boolean {
    const attribute = attributeItem.namedChildren[0];
    const tokens = attribute?.childForFieldName(RustCfg.argumentsField);

    return (
      attribute?.namedChildren[0]?.text === RustCfg.cfg &&
      tokens !== null &&
      tokens !== undefined &&
      RustCfg.predicates(tokens).some((predicate) => RustCfg.needs(predicate, option))
    );
  }

  /** Whether a `cfg` predicate holds only where `option` does: in it, an `all` with it, an `any` of only it. */
  private static needs(
    predicate: readonly Node[],
    option: (tokens: readonly Node[]) => boolean,
  ): boolean {
    const [head, inner, ...rest] = predicate;

    if (head === undefined || inner?.type !== RustCfg.tokenTree || rest.length > 0) {
      return option(predicate);
    }

    const list = RustCfg.predicates(inner);

    switch (head.text) {
      case RustCfg.allOf:
        return list.some((each) => RustCfg.needs(each, option));
      case RustCfg.anyOf:
        return list.length > 0 && list.every((each) => RustCfg.needs(each, option));
      default:
        return false;
    }
  }

  /** The predicates of a `cfg` token tree, each its tokens between commas. */
  private static predicates(tokens: Node): Node[][] {
    const predicates: Node[][] = [[]];

    for (const token of tokens.children.slice(1, -1)) {
      if (token.type === RustCfg.listSeparator) {
        predicates.push([]);
      } else {
        predicates.at(-1)?.push(token);
      }
    }

    return predicates.filter((predicate) => predicate.length > 0);
  }
}
