import { Language, type Node, Parser } from 'web-tree-sitter';

import { RustCfg } from './rust-cfg.ts';
import { RustSyntax } from './rust-syntax.ts';
import type { RustImpl, RustUse } from './rust-syntax.ts';

/** A name a Rust module declares, with what a path can reach through it. */
export interface RustItem {
  readonly name: string;
  /** Whether it is plain `pub` and not `#[doc(hidden)]`, so the crate's documented surface has it. */
  readonly shown: boolean;
  /** The module it names, for `mod`. */
  readonly module: RustModule | undefined;
  /** What `Item::member` reaches declared with it: public fields, variants, a trait's items. */
  readonly members: readonly string[];
  /**
   * What `Item::member` reaches through the impl blocks {@link ApiItems} finds for this item, each
   * with whether only the `unstable` feature compiles it.
   */
  readonly implMembers: Map<string, boolean>;
  /** Whether only the `unstable` feature compiles it, by its own `cfg` or its module's. */
  readonly gated: boolean;
}

/** A `use` of a module, with whether only the `unstable` feature compiles it. */
export interface RustModuleUse extends RustUse {
  readonly gated: boolean;
}

/** One module of a crate: what it declares and what it uses, in source order. */
export interface RustModule {
  readonly crate: string;
  readonly parent: RustModule | undefined;
  readonly items: RustItem[];
  readonly uses: RustModuleUse[];
  /** Whether only the `unstable` feature compiles it, and so everything in it. */
  readonly gated: boolean;
}

/** An impl block with the module it is written in, whose names its type path resolves through. */
export interface RustModuleImpl {
  readonly module: RustModule;
  readonly impl: RustImpl;
  /** Whether only the `unstable` feature compiles the block. */
  readonly gated: boolean;
}

/** What reading one crate shares across its files. */
interface Reader {
  readonly parser: Parser;
  readonly files: ReadonlyMap<string, string>;
  readonly impls: RustModuleImpl[];
  readonly root: RustModule;
  /** The local `macro_rules!` that declare items, by name, as far as the read has come. */
  readonly declaring: Set<string>;
}

/** One item node of a module body with what its attributes say. */
interface ItemNode {
  readonly node: Node;
  readonly name: string;
  readonly shown: boolean;
  readonly gated: boolean;
  readonly attributes: string;
}

/**
 * A crate's module tree read from its source files with tree-sitter, as far as public paths need:
 * modules, items, uses and the impl blocks. Use {@link RustCrate.parse} on the files of its `src/`;
 * test-only items, `#[path]` modules and the output of macros are not read, apart from the entries
 * of a local `macro_rules!` that declares one public item per entry.
 */
export class RustCrate {
  private static readonly grammar = 'tree-sitter-rust/tree-sitter-rust.wasm';
  private static readonly root = 'lib.rs';
  private static readonly modFile = 'mod.rs';
  private static readonly extension = '.rs';
  private static readonly attribute = 'attribute_item';
  private static readonly modItem = 'mod_item';
  private static readonly useItem = 'use_declaration';
  private static readonly implItem = 'impl_item';
  private static readonly macroDefinition = 'macro_definition';
  private static readonly macroInvocation = 'macro_invocation';
  private static readonly statement = 'expression_statement';
  private static readonly nameField = 'name';
  private static readonly bodyField = 'body';
  private static readonly argumentField = 'argument';
  private static readonly macroField = 'macro';
  private static readonly hidden = /\bdoc\s*\(\s*hidden\s*\)/u;
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
    /** Every impl block of the crate, with the module it is written in. */
    public readonly impls: readonly RustModuleImpl[],
  ) {}

  /**
   * The crate `name` (`enshwick_base`) from `files`, its `src/` files by their path below `src/`
   * with `/` between folders; `lib.rs` is its root.
   *
   * @throws {Error} When `files` has no `lib.rs`, or the Rust grammar does not load.
   */
  public static async parse(name: string, files: ReadonlyMap<string, string>): Promise<RustCrate> {
    const parser = await RustCrate.parserOnce();
    const text = files.get(RustCrate.root);

    if (text === undefined) {
      throw new Error(`crate ${name} has no src/${RustCrate.root}`);
    }

    const root: RustModule = { crate: name, parent: undefined, items: [], uses: [], gated: false };
    const reader: Reader = { parser, files, impls: [], root, declaring: new Set() };

    RustCrate.readFile(reader, root, text, '');

    return new RustCrate(name, root, reader.impls);
  }

  /** The one parser, loaded at the first parse; a load that fails is tried again by the next. */
  private static async parserOnce(): Promise<Parser> {
    RustCrate.parser ??= RustCrate.loadParser();

    try {
      return await RustCrate.parser;
    } catch (error) {
      RustCrate.parser = undefined;

      throw error;
    }
  }

  private static async loadParser(): Promise<Parser> {
    await Parser.init();
    const parser = new Parser();

    parser.setLanguage(
      await Language.load(Bun.fileURLToPath(import.meta.resolve(RustCrate.grammar))),
    );

    return parser;
  }

  /** Reads a file's items into `module` and frees its tree, which only the read needs. */
  private static readFile(reader: Reader, module: RustModule, text: string, folder: string): void {
    const tree = reader.parser.parse(text);

    if (tree === null) {
      throw new Error('tree-sitter returned no tree');
    }

    try {
      RustCrate.readBody(reader, module, tree.rootNode, folder);
    } finally {
      tree.delete();
    }
  }

  /** Reads the items of `body` into `module`, whose child files live in the folder `folder`. */
  private static readBody(reader: Reader, module: RustModule, body: Node, folder: string): void {
    let attributes: Node[] = [];

    for (const node of body.namedChildren) {
      if (node.type === RustCrate.attribute) {
        attributes.push(node);
        continue;
      }

      if (RustSyntax.isComment(node)) {
        continue;
      }

      const said = attributes.map((attribute) => attribute.text).join('\n');
      const testOnly = attributes.some((attribute) => RustCfg.isTestOnly(attribute));
      const gated = module.gated || attributes.some((attribute) => RustCfg.isUnstable(attribute));

      attributes = [];

      if (!testOnly) {
        RustCrate.readItem(reader, module, folder, {
          node,
          name: node.childForFieldName(RustCrate.nameField)?.text ?? '',
          shown: RustSyntax.isPublic(node) && !RustCrate.hidden.test(said),
          gated,
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
    const { node, name, shown, gated } = item;

    if (node.type === RustCrate.modItem) {
      const child = RustCrate.child(reader, module, node, `${folder}${name}`, gated);

      module.items.push(RustCrate.item(name, shown, gated, child));
    } else if (RustCrate.types.includes(node.type)) {
      module.items.push(RustCrate.item(name, shown, gated, undefined, RustSyntax.members(node)));
    } else if (RustCrate.values.includes(node.type)) {
      module.items.push(RustCrate.item(name, shown, gated));
    } else if (node.type === RustCrate.useItem) {
      const argument = node.childForFieldName(RustCrate.argumentField);
      const uses = argument === null ? [] : RustSyntax.uses(argument, [], shown);

      module.uses.push(...uses.map((use) => Object.assign(use, { gated })));
    } else if (node.type === RustCrate.implItem) {
      const impl = RustSyntax.impl(node);

      if (impl !== undefined) {
        reader.impls.push({ module, impl, gated });
      }
    } else {
      RustCrate.readMacro(reader, module, item);
    }
  }

  /**
   * Reads a `macro_rules!` definition, an exported one at its crate's root wherever it is written,
   * or the entries of an invocation of a local item-declaring one, with braces or parentheses.
   */
  private static readMacro(
    reader: Reader,
    module: RustModule,
    { node, name, gated, attributes }: ItemNode,
  ): void {
    const invocation = node.type === RustCrate.statement ? node.namedChildren[0] : node;

    if (node.type === RustCrate.macroDefinition) {
      if (RustCrate.declaresItem.test(node.text)) {
        reader.declaring.add(name);
      }

      if (RustCrate.exported.test(attributes)) {
        reader.root.items.push(RustCrate.item(name, !RustCrate.hidden.test(attributes), gated));
      }
    } else if (
      invocation?.type === RustCrate.macroInvocation &&
      reader.declaring.has(invocation.childForFieldName(RustCrate.macroField)?.text ?? '')
    ) {
      for (const entry of RustSyntax.entryNames(invocation)) {
        module.items.push(RustCrate.item(entry, true, gated));
      }
    }
  }

  private static item(
    name: string,
    shown: boolean,
    gated: boolean,
    module?: RustModule,
    members: readonly string[] = [],
  ): RustItem {
    return { name, shown, module, members, implMembers: new Map(), gated };
  }

  /** The module a `mod` item declares, inline or in `<path>.rs` or `<path>/mod.rs`. */
  private static child(
    reader: Reader,
    parent: RustModule,
    node: Node,
    path: string,
    gated: boolean,
  ): RustModule {
    const child: RustModule = { crate: parent.crate, parent, items: [], uses: [], gated };
    const inline = node.childForFieldName(RustCrate.bodyField);

    if (inline !== null) {
      RustCrate.readBody(reader, child, inline, `${path}/`);

      return child;
    }

    const text =
      reader.files.get(`${path}${RustCrate.extension}`) ??
      reader.files.get(`${path}/${RustCrate.modFile}`);

    if (text !== undefined) {
      RustCrate.readFile(reader, child, text, `${path}/`);
    }

    return child;
  }
}
