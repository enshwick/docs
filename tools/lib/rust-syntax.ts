import type { Node } from 'web-tree-sitter';

/** One `use` of a module, flattened: a path that brings one name, or every public name with `*`. */
export interface RustUse {
  readonly path: readonly string[];
  /** The name it brings into the module, or `undefined` for a glob. */
  readonly name: string | undefined;
  readonly shown: boolean;
}

/**
 * What the public paths of a crate need from tree-sitter's Rust syntax nodes: visibility, the
 * members a type or an impl block gives, flattened `use` trees and the names a local macro
 * declares. {@link RustCrate} reads a crate's files through it.
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

  /** The members a type or trait declares with itself: public fields, every variant, a trait's items. */
  public static members(node: Node): string[] {
    const body = node.childForFieldName('body');

    return (body?.namedChildren ?? []).flatMap((child) => {
      const name = child.childForFieldName('name')?.text;

      if (name === undefined) {
        return [];
      }

      return (child.type === 'field_declaration' && RustSyntax.isPublic(child)) ||
        RustSyntax.declaredMembers.includes(child.type)
        ? [name]
        : [];
    });
  }

  /**
   * The type an impl block is for and the members it adds: every item of a trait impl, the `pub`
   * ones of an inherent one; `undefined` for an impl on a reference, tuple or the like.
   */
  public static impl(node: Node): { type: string; members: string[] } | undefined {
    const type = RustSyntax.typeName(node.childForFieldName('type'));
    const body = node.childForFieldName('body');

    if (type === undefined || body === null) {
      return undefined;
    }

    const ofTrait = node.childForFieldName('trait') !== null;
    const members = body.namedChildren.flatMap((child) => {
      const name = child.childForFieldName('name')?.text;

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
      case 'use_as_clause': {
        const path = RustSyntax.under(prefix, RustSyntax.path(node.childForFieldName('path')));

        return [{ path, name: node.childForFieldName('alias')?.text ?? path.at(-1), shown }];
      }

      case 'use_wildcard': {
        const inner = node.namedChildren[0];
        const path =
          inner === undefined ? [...prefix] : RustSyntax.under(prefix, RustSyntax.path(inner));

        return [{ path, name: undefined, shown }];
      }

      case 'scoped_use_list': {
        const path = RustSyntax.under(prefix, RustSyntax.path(node.childForFieldName('path')));
        const list = node.childForFieldName('list');

        return list === null ? [] : RustSyntax.uses(list, path, shown);
      }

      case 'use_list':
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
        RustSyntax.comments.includes(token.type) ||
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

  /** The last name of an impl's type, `Load` in `crate::Load<'a>`. */
  private static typeName(node: Node | null): string | undefined {
    if (node === null) {
      return undefined;
    }

    switch (node.type) {
      case 'type_identifier':
        return node.text;
      case 'generic_type':
        return RustSyntax.typeName(node.childForFieldName('type'));
      case 'scoped_type_identifier':
        return node.childForFieldName('name')?.text;
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
