import { ApiSources } from './api-sources.ts';
import type { GitSource } from './git-source.ts';
import { RustCrate } from './rust-crate.ts';
import type { RustItem, RustModule, RustModuleUse } from './rust-crate.ts';

/** What a name reaches in a module: modules to go into, and the items whose members `Name::member` reaches. */
interface Entry {
  readonly modules: RustModule[];
  readonly items: RustItem[];
  /** Whether only the `unstable` feature compiles what the name reaches. */
  gated: boolean;
}

/** The public paths of the API crate, and those of them only its `unstable` feature compiles. */
export interface ApiPaths {
  readonly all: readonly string[];
  readonly unstable: readonly string[];
}

/**
 * Every public path of the `enshwick` crate, read from the source of it and of the internal crates
 * it re-exports: modules, items and the members a type gives (`content::changes::Field::MaxStackSize`,
 * `Load::add_recipe`), each under every path the crate re-exports it at, and which of them only the
 * `unstable` feature compiles. The coverage table names its items by these paths, so the build
 * refuses one the crate lacks.
 */
export class ApiItems {
  private static readonly pathSeparator = '::';
  private static readonly crateSegment = 'crate';
  private static readonly selfSegment = 'self';
  private static readonly superSegment = 'super';

  private readonly exportsOf = new Map<RustModule, Map<string, Entry>>();
  private readonly scopeOf = new Map<RustModule, Map<string, Entry>>();
  /** Each path found, with whether only the `unstable` feature compiles it on every way it is reached. */
  private readonly found = new Map<string, boolean>();

  private constructor(private readonly crates: ReadonlyMap<string, RustCrate>) {}

  /**
   * The public paths of the crate `root` among `crates`, each given as its `src/` files by their
   * path below `src/`, sorted.
   *
   * @throws {Error} When `crates` lacks `root` or a crate has no `lib.rs`.
   */
  public static async of(
    crates: ReadonlyMap<string, ReadonlyMap<string, string>>,
    root: string = ApiSources.crateName,
  ): Promise<ApiPaths> {
    const parsed = await Promise.all(
      [...crates].map(([name, files]) => RustCrate.parse(name, files)),
    );
    const top = parsed.find((crate) => crate.name === root);

    if (top === undefined) {
      throw new Error(`no source of crate ${root}`);
    }

    const items = new ApiItems(new Map(parsed.map((crate) => [crate.name, crate])));

    for (const { module, impl, gated } of parsed.flatMap((crate) => crate.impls)) {
      for (const item of items.resolve(module, impl.type)?.items ?? []) {
        for (const member of impl.members) {
          item.implMembers.set(member, gated && (item.implMembers.get(member) ?? true));
        }
      }
    }

    items.walk(top.root, [], new Set(), false);

    const all = [...items.found.keys()].toSorted();

    return { all, unstable: all.filter((path) => items.found.get(path) === true) };
  }

  /** The public paths of the API crate in `checkout`, whose workspace manifest is `workspace`. */
  public static async read(checkout: GitSource, workspace: string | undefined): Promise<ApiPaths> {
    return ApiItems.of(await ApiSources.read(checkout, workspace));
  }

  /**
   * Records every public path below `module`, reached at `prefix`, gated when `gated` is;
   * `chain` keeps a re-export cycle finite.
   */
  private walk(
    module: RustModule,
    prefix: readonly string[],
    chain: ReadonlySet<RustModule>,
    gated: boolean,
  ): void {
    const inside = new Set([...chain, module]);

    for (const [name, entry] of this.exports(module)) {
      const path = [...prefix, name];
      const joined = path.join(ApiItems.pathSeparator);
      const pathGated = gated || entry.gated;

      this.record(joined, pathGated);

      for (const [member, memberGated] of ApiItems.members(entry)) {
        this.record(`${joined}${ApiItems.pathSeparator}${member}`, pathGated || memberGated);
      }

      for (const child of entry.modules.filter((inner) => !inside.has(inner))) {
        this.walk(child, path, inside, pathGated);
      }
    }
  }

  /** Records `path`, gated only while every way to it is. */
  private record(path: string, gated: boolean): void {
    this.found.set(path, gated && (this.found.get(path) ?? true));
  }

  /** The names `module` shows: its shown items and what its shown uses bring. */
  private exports(module: RustModule): Map<string, Entry> {
    return this.names(module, this.exportsOf, true);
  }

  /** Every name in `module`, private ones included, as a path inside its crate resolves it. */
  private scope(module: RustModule): Map<string, Entry> {
    return this.names(module, this.scopeOf, false);
  }

  /**
   * The names of `module`. Its uses resolve again while any new one resolves, so a use may name
   * what a later use brings; one that never resolves still names something, such as a proc macro.
   */
  private names(
    module: RustModule,
    cache: Map<RustModule, Map<string, Entry>>,
    shownOnly: boolean,
  ): Map<string, Entry> {
    const cached = cache.get(module);

    if (cached !== undefined) {
      return cached;
    }

    // A cycle of globs reads the names gathered so far.
    const names = new Map<string, Entry>();

    cache.set(module, names);

    for (const item of module.items.filter((declared) => declared.shown || !shownOnly)) {
      ApiItems.add(names, item.name, {
        modules: item.module === undefined ? [] : [item.module],
        items: [item],
        gated: item.gated,
      });
    }

    let pending = module.uses.filter((used) => used.shown || !shownOnly);

    while (pending.length > 0) {
      const left = pending.filter((use) => !this.addUse(names, module, use, false));

      if (left.length === pending.length) {
        for (const use of left) {
          this.addUse(names, module, use, true);
        }

        break;
      }

      pending = left;
    }

    return names;
  }

  /** Adds what `use` brings into `names`, unless it does not resolve yet and `last` is false. */
  private addUse(
    names: Map<string, Entry>,
    module: RustModule,
    use: RustModuleUse,
    last: boolean,
  ): boolean {
    const target = this.resolve(module, use.path);

    if (target === undefined && !last) {
      return false;
    }

    const reached = target ?? ApiItems.empty(false);
    const gated = use.gated || reached.gated;

    if (use.name === undefined) {
      this.addGlob(names, reached, gated);
    } else {
      ApiItems.add(names, use.name, { modules: reached.modules, items: reached.items, gated });
    }

    return true;
  }

  /**
   * Adds every name a glob `use` of `target` brings: what its modules show, and an enum's
   * variants, each gated where the glob is.
   */
  private addGlob(names: Map<string, Entry>, target: Entry, gated: boolean): void {
    for (const glob of target.modules) {
      for (const [name, entry] of this.exports(glob)) {
        ApiItems.add(names, name, { ...entry, gated: gated || entry.gated });
      }
    }

    for (const variant of target.items.flatMap((item) => item.members)) {
      ApiItems.add(names, variant, ApiItems.empty(gated));
    }
  }

  /** What a path reaches from `module`, or `undefined` when the source cannot follow it. */
  private resolve(module: RustModule, path: readonly string[]): Entry | undefined {
    const [first, ...rest] = path;
    let entry = first === undefined ? undefined : this.start(module, first);

    for (const name of rest) {
      if (entry === undefined) {
        return undefined;
      }

      const inner = entry.modules
        .map((child) =>
          name === ApiItems.superSegment
            ? ApiItems.entryOf(child.parent)
            : this.scope(child).get(name),
        )
        .find((reached) => reached !== undefined);

      entry =
        inner ?? (ApiItems.members(entry).has(name) ? ApiItems.empty(entry.gated) : undefined);
    }

    return entry;
  }

  /** What the first name of a path reaches from `module`. */
  private start(module: RustModule, first: string): Entry | undefined {
    switch (first) {
      case ApiItems.crateSegment:
        return ApiItems.entryOf(this.crates.get(module.crate)?.root);
      case ApiItems.selfSegment:
        return ApiItems.entryOf(module);
      case ApiItems.superSegment:
        return ApiItems.entryOf(module.parent);
      default:
        return this.scope(module).get(first) ?? ApiItems.entryOf(this.crates.get(first)?.root);
    }
  }

  /**
   * What `Name::member` reaches through an entry, its items' declared and impl members, each with
   * whether only the `unstable` feature compiles it beyond what gates the name.
   */
  private static members(entry: Entry): ReadonlyMap<string, boolean> {
    const members = new Map<string, boolean>();

    for (const item of entry.items) {
      for (const [member, gated] of [
        ...item.members.map((declared) => [declared, false] as const),
        ...item.implMembers,
      ]) {
        members.set(member, gated && (members.get(member) ?? true));
      }
    }

    return members;
  }

  private static entryOf(module: RustModule | undefined): Entry | undefined {
    return module === undefined ? undefined : { modules: [module], items: [], gated: module.gated };
  }

  /** An entry that reaches nothing a path can go on through, such as a variant. */
  private static empty(gated: boolean): Entry {
    return { modules: [], items: [], gated };
  }

  /** Adds `entry` under `name`, beside what the name reaches in another namespace. */
  private static add(names: Map<string, Entry>, name: string, entry: Entry): void {
    const known = names.get(name);

    if (known === undefined) {
      names.set(name, { modules: [...entry.modules], items: [...entry.items], gated: entry.gated });

      return;
    }

    known.modules.push(...entry.modules.filter((module) => !known.modules.includes(module)));
    known.items.push(...entry.items.filter((item) => !known.items.includes(item)));
    known.gated &&= entry.gated;
  }
}
