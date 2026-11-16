import { Language, type Node, Parser } from 'web-tree-sitter';

import { RustSyntax } from './rust-syntax.ts';
import type { RustUse } from './rust-syntax.ts';

/** A name a Rust module declares, with what a path can reach through it. */
export interface RustItem {
  readonly name: string;
  /** Whether it is plain `pub` and not `#[doc(hidden)]`, so the crate's documented surface has it. */
  readonly shown: boolean;
  /** The module it names, for `mod`. */
  readonly module: RustModule | undefined;
  /** What `Item::member` reaches declared with it: public fields, variants, a trait's items. */
  readonly members: readonly string[];
}

/** One module of a crate: what it declares and what it uses, in source order. */
export interface RustModule {
  readonly crate: string;
  readonly parent: RustModule | undefined;
  readonly items: RustItem[];
  readonly uses: RustUse[];
}

/** What reading one crate shares across its files. */
interface Reader {
  readonly parser: Parser;
  readonly files: ReadonlyMap<string, string>;
  readonly impls: Map<string, string[]>;
  readonly root: RustModule;
  /** The local `macro_rules!` that declare items, by name, as far as the read has come. */
  readonly declaring: Set<string>;
}

/** One item node of a module body with what its attributes say. */
interface ItemNode {
  readonly node: Node;
  readonly name: string;
  readonly shown: boolean;
  readonly attributes: string;
}

/**
 * A crate's module tree read from its source files with tree-sitter, as far as public paths need:
 * modules, items, uses and the members impl blocks add. Use {@link RustCrate.parse} on the files of
 * its `src/`; `#[cfg(test)]` items, `#[path]` modules and the output of macros are not read, apart
 * from the entries of a local `macro_rules!` that declares one public item per entry.
 */
export class RustCrate {
  private static readonly wasm = 'node_modules/tree-sitter-rust/tree-sitter-rust.wasm';
  private static readonly root = 'lib.rs';
  private static readonly modFile = 'mod.rs';
  private static readonly extension = '.rs';
  private static readonly attribute = 'attribute_item';
  private static readonly hidden = /\bdoc\s*\(\s*hidden\s*\)/u;
  private static readonly testOnly = /\bcfg\s*\(\s*(?:test|doctest)\s*\)/u;
  private static readonly exported = /\bmacro_export\b/u;
  /** A `macro_rules!` whose expansion declares a public item named by one of its fragments. */
  private static readonly declaresItem =
    /\bpub\s+(?:struct|enum|union|trait|type|fn|const|static)\s+\$[a-z_]+/u;
  private static readonly types = ['struct_item', 'union_item', 'enum_item', 'trait_item'];
  private static readonly values = ['function_item', 'const_item', 'static_item', 'type_item'];
  private static parser: Promise<Parser> | undefined;

  private constructor(
    public readonly name: string,
    public readonly root: RustModule,
    /** The members each impl block adds to a type, by the type's name. */
    public readonly impls: ReadonlyMap<string, readonly string[]>,
  ) {}

  /**
   * The crate `name` (`enshwick_base`) from `files`, its `src/` files by their path below `src/`
   * with `/` between folders; `lib.rs` is its root.
   *
   * @throws {Error} When `files` has no `lib.rs`.
   */
  public static async parse(name: string, files: ReadonlyMap<string, string>): Promise<RustCrate> {
    const parser = await RustCrate.parserOnce();
    const text = files.get(RustCrate.root);

    if (text === undefined) {
      throw new Error(`crate ${name} has no src/${RustCrate.root}`);
    }

    const root: RustModule = { crate: name, parent: undefined, items: [], uses: [] };
    const reader: Reader = { parser, files, impls: new Map(), root, declaring: new Set() };

    RustCrate.readBody(reader, root, RustCrate.tree(parser, text), '');

    return new RustCrate(name, root, reader.impls);
  }

  private static parserOnce(): Promise<Parser> {
    RustCrate.parser ??= (async () => {
      await Parser.init();
      const parser = new Parser();

      parser.setLanguage(await Language.load(RustCrate.wasm));

      return parser;
    })();

    return RustCrate.parser;
  }

  private static tree(parser: Parser, text: string): Node {
    const tree = parser.parse(text);

    if (tree === null) {
      throw new Error('tree-sitter returned no tree');
    }

    return tree.rootNode;
  }

  /** Reads the items of `body` into `module`, whose child files live in the folder `folder`. */
  private static readBody(reader: Reader, module: RustModule, body: Node, folder: string): void {
    let attributes: string[] = [];

    for (const node of body.namedChildren) {
      if (node.type === RustCrate.attribute) {
        attributes.push(node.text);
        continue;
      }

      const said = attributes.join('\n');

      attributes = [];

      if (!RustCrate.testOnly.test(said)) {
        RustCrate.readItem(reader, module, folder, {
          node,
          name: node.childForFieldName('name')?.text ?? '',
          shown: RustSyntax.isPublic(node) && !RustCrate.hidden.test(said),
          attributes: said,
        });
      }
    }
  }

  private static readItem(
    reader: Reader,
    module: RustModule,
    folder: string,
    item: ItemNode,
  ): void {
    const { node, name, shown } = item;

    if (node.type === 'mod_item') {
      module.items.push({
        name,
        shown,
        module: RustCrate.child(reader, module, node, `${folder}${name}`),
        members: [],
      });
    } else if (RustCrate.types.includes(node.type)) {
      module.items.push({ name, shown, module: undefined, members: RustSyntax.members(node) });
    } else if (RustCrate.values.includes(node.type)) {
      module.items.push({ name, shown, module: undefined, members: [] });
    } else if (node.type === 'use_declaration') {
      const argument = node.childForFieldName('argument');

      module.uses.push(...(argument === null ? [] : RustSyntax.uses(argument, [], shown)));
    } else if (node.type === 'impl_item') {
      const impl = RustSyntax.impl(node);

      if (impl !== undefined) {
        reader.impls.set(impl.type, [...(reader.impls.get(impl.type) ?? []), ...impl.members]);
      }
    } else {
      RustCrate.readMacro(reader, module, item);
    }
  }

  /**
   * Reads a `macro_rules!` definition, an exported one at its crate's root wherever it is written,
   * or the entries of an invocation of a local item-declaring one.
   */
  private static readMacro(
    reader: Reader,
    module: RustModule,
    { node, name, attributes }: ItemNode,
  ): void {
    if (node.type === 'macro_definition') {
      if (RustCrate.declaresItem.test(node.text)) {
        reader.declaring.add(name);
      }

      if (RustCrate.exported.test(attributes)) {
        reader.root.items.push({
          name,
          shown: !RustCrate.hidden.test(attributes),
          module: undefined,
          members: [],
        });
      }
    } else if (
      node.type === 'macro_invocation' &&
      reader.declaring.has(node.childForFieldName('macro')?.text ?? '')
    ) {
      for (const entry of RustSyntax.entryNames(node)) {
        module.items.push({ name: entry, shown: true, module: undefined, members: [] });
      }
    }
  }

  /** The module a `mod` item declares, inline or in `<path>.rs` or `<path>/mod.rs`. */
  private static child(reader: Reader, parent: RustModule, node: Node, path: string): RustModule {
    const child: RustModule = { crate: parent.crate, parent, items: [], uses: [] };
    const inline = node.childForFieldName('body');
    const text =
      inline === null
        ? (reader.files.get(`${path}${RustCrate.extension}`) ??
          reader.files.get(`${path}/${RustCrate.modFile}`))
        : undefined;
    const body = inline ?? (text === undefined ? undefined : RustCrate.tree(reader.parser, text));

    if (body !== undefined) {
      RustCrate.readBody(reader, child, body, `${path}/`);
    }

    return child;
  }
}
