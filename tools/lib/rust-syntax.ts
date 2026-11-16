import type { Node } from 'web-tree-sitter';

/** One `use` of a module, flattened: a path that brings one name, or every public name with `*`. */
export interface RustUse {
  readonly path: readonly string[];
  /** The name it brings into the module, or `undefined` for a glob. */
  readonly name: string | undefined;
  readonly shown: boolean;
}

/** An impl block: the path of the type it is for, as written, and the members it adds. */
export interface RustImpl {
  readonly type: readonly string[];
  readonly members: readonly string[];
}

/**
 * What the public paths of a crate need from tree-sitter's Rust syntax nodes: visibility, the
 * members a type or an impl block gives, flattened `use` trees and the names
 * a local macro declares. {@link RustCrate} reads a crate's files through it.
 */
export class RustSyntax {
  private static readonly visibility = 'visibility_modifier';
  private static readonly plainPublic = 'pub';
  private static readonly pathSeparator = '::';
  private static readonly selfSegment = 'self';
  private static readonly whitespace = /\s+/gu;
  private static readonly tokenTree = 'token_tree';
  private static readonly identifier = 'identifier';
  private static readonly attributeMark = '#';
  private static readonly entryEnd = ';';

  private static readonly comments = ['line_comment', 'block_comment'];
  private static readonly fieldDeclaration = 'field_declaration';
  private static readonly useAs = 'use_as_clause';
  private static readonly useWildcard = 'use_wildcard';
  private static readonly scopedUseList = 'scoped_use_list';
  private static readonly useList = 'use_list';
  private static readonly typeIdentifier = 'type_identifier';
  private static readonly genericType = 'generic_type';
  private static readonly scopedType = 'scoped_type_identifier';
  private static readonly nameField = 'name';
  private static readonly bodyField = 'body';
  private static readonly typeField = 'type';
  private static readonly traitField = 'trait';
  private static readonly pathField = 'path';
  private static readonly aliasField = 'alias';
  private static readonly listField = 'list';
  /** What a type or trait declares with itself that `Type::member` reaches, fields apart. */
  private static readonly declaredMembers = [
    'enum_variant',
    'function_item',
    'function_signature_item',
    'const_item',
    'associated_type',
  ];
  /** An impl's items; a body-less `fn` is one an attribute macro, such as a forward, fills. */
  private static readonly implMembers = [
    'function_item',
    'function_signature_item',
    'const_item',
    'type_item',
  ];

  /** Whether an item's visibility is plain `pub`, not `pub(crate)` or narrower. */
  public static isPublic(node: Node): boolean {
    return node.namedChildren.some(
      (child) => child.type === RustSyntax.visibility && child.text === RustSyntax.plainPublic,
    );
  }

  /** Whether a node is a comment, doc comments included, which leaves the attributes before it in force. */
  public static isComment(node: Node): boolean {
    return RustSyntax.comments.includes(node.type);
  }

  /** The members a type or trait declares with itself: public fields, every variant, a trait's items. */
  public static members(node: Node): string[] {
    const body = node.childForFieldName(RustSyntax.bodyField);

    return (body?.namedChildren ?? []).flatMap((child) => {
      const name = child.childForFieldName(RustSyntax.nameField)?.text;

      if (name === undefined) {
        return [];
      }

      return (child.type === RustSyntax.fieldDeclaration && RustSyntax.isPublic(child)) ||
        RustSyntax.declaredMembers.includes(child.type)
        ? [name]
        : [];
    });
  }

  /**
   * The type an impl block is for and the members it adds: every item of a trait impl, the `pub`
   * ones of an inherent one; `undefined` for an impl on a reference, tuple or the like.
   */
  public static impl(node: Node): RustImpl | undefined {
    const type = RustSyntax.typePath(node.childForFieldName(RustSyntax.typeField));
    const body = node.childForFieldName(RustSyntax.bodyField);

    if (type === undefined || body === null) {
      return undefined;
    }

    const ofTrait = node.childForFieldName(RustSyntax.traitField) !== null;
    const members = body.namedChildren.flatMap((child) => {
      const name = child.childForFieldName(RustSyntax.nameField)?.text;

      return name !== undefined &&
        RustSyntax.implMembers.includes(child.type) &&
        (ofTrait || RustSyntax.isPublic(child))
        ? [name]
        : [];
    });

    return { type, members };
  }

  /** A `use` tree flattened below the path `prefix`. */
  public static uses(node: Node, prefix: readonly string[], shown: boolean): RustUse[] {
    switch (node.type) {
      case RustSyntax.useAs: {
        const path = RustSyntax.under(
          prefix,
          RustSyntax.path(node.childForFieldName(RustSyntax.pathField)),
        );

        return [
          {
            path,
            name: node.childForFieldName(RustSyntax.aliasField)?.text ?? path.at(-1),
            shown,
          },
        ];
      }

      case RustSyntax.useWildcard: {
        const inner = node.namedChildren[0];
        const path =
          inner === undefined ? [...prefix] : RustSyntax.under(prefix, RustSyntax.path(inner));

        return [{ path, name: undefined, shown }];
      }

      case RustSyntax.scopedUseList: {
        const path = RustSyntax.under(
          prefix,
          RustSyntax.path(node.childForFieldName(RustSyntax.pathField)),
        );
        const list = node.childForFieldName(RustSyntax.listField);

        return list === null ? [] : RustSyntax.uses(list, path, shown);
      }

      case RustSyntax.useList:
        return node.namedChildren.flatMap((child) => RustSyntax.uses(child, prefix, shown));

      default: {
        const path = RustSyntax.under(prefix, RustSyntax.path(node));

        return [{ path, name: path.at(-1), shown }];
      }
    }
  }

  /**
   * The names an invocation of a local item-declaring macro declares: the first name of each entry
   * between `;`, after its doc comments and attributes, as in `PlayerJoined = PLAYER_JOINED: ...;`.
   */
  public static entryNames(invocation: Node): string[] {
    const tokens = invocation.namedChildren.find((child) => child.type === RustSyntax.tokenTree);
    const names: string[] = [];
    let entryStart = true;

    for (const token of tokens?.children.slice(1, -1) ?? []) {
      const skipped =
        RustSyntax.isComment(token) ||
        token.type === RustSyntax.attributeMark ||
        (token.type === RustSyntax.tokenTree && entryStart);

      if (skipped) {
        continue;
      }

      if (entryStart && token.type === RustSyntax.identifier) {
        names.push(token.text);
      }

      entryStart = token.type === RustSyntax.entryEnd;
    }

    return names;
  }

  /** The path of an impl's type as written, `crate::Load` in `crate::Load<'a>`. */
  private static typePath(node: Node | null): readonly string[] | undefined {
    if (node === null) {
      return undefined;
    }

    switch (node.type) {
      case RustSyntax.typeIdentifier:
        return [node.text];
      case RustSyntax.genericType:
        return RustSyntax.typePath(node.childForFieldName(RustSyntax.typeField));
      case RustSyntax.scopedType:
        return RustSyntax.path(node);
      default:
        return undefined;
    }
  }

  /** A path below `prefix`, `self` of a use list standing for the path it is listed under. */
  private static under(prefix: readonly string[], path: readonly string[]): string[] {
    return path.length === 1 && path[0] === RustSyntax.selfSegment && prefix.length > 0
      ? [...prefix]
      : [...prefix, ...path];
  }

  private static path(node: Node | null): string[] {
    return node === null
      ? []
      : node.text.replaceAll(RustSyntax.whitespace, '').split(RustSyntax.pathSeparator);
  }
}
