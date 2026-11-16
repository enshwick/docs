import { ApiSources } from './api-sources.ts';
import type { GitSource } from './git-source.ts';
import { RustCrate } from './rust-crate.ts';
import type { RustModule } from './rust-crate.ts';

/** What a name reaches in a module: modules to go into, and the members `Name::member` reaches. */
interface Entry {
  readonly modules: RustModule[];
  readonly members: Set<string>;
}

/**
 * Every public path of the `enshwick` crate, read from the source of it and of the internal crates
 * it re-exports: modules, items and the members a type gives (`content::changes::Field::MaxStackSize`,
 * `Load::add_recipe`), each under every path the crate re-exports it at. The coverage table names
 * its items by these paths, so the build refuses one the crate lacks.
 */
export class ApiItems {
  private static readonly pathSeparator = '::';
  private static readonly crateSegment = 'crate';
  private static readonly selfSegment = 'self';
  private static readonly superSegment = 'super';

  private readonly exportsOf = new Map<RustModule, Map<string, Entry>>();
  private readonly scopeOf = new Map<RustModule, Map<string, Entry>>();
  private readonly found = new Set<string>();

  private constructor(
    private readonly crates: ReadonlyMap<string, RustCrate>,
    private readonly impls: ReadonlyMap<string, ReadonlySet<string>>,
  ) {}

  /**
   * The public paths of the crate `root` among `crates`, each given as its `src/` files by their
   * path below `src/`, sorted.
   *
   * @throws {Error} When `crates` lacks `root` or a crate has no `lib.rs`.
   */
  public static async of(
    crates: ReadonlyMap<string, ReadonlyMap<string, string>>,
    root: string = ApiSources.crateName,
  ): Promise<readonly string[]> {
    const parsed = await Promise.all(
      [...crates].map(([name, files]) => RustCrate.parse(name, files)),
    );
    const top = parsed.find((crate) => crate.name === root);

    if (top === undefined) {
      throw new Error(`no source of crate ${root}`);
    }

    const impls = new Map<string, Set<string>>();

    for (const [type, members] of parsed.flatMap((crate) => [...crate.impls])) {
      impls.set(type, new Set([...(impls.get(type) ?? []), ...members]));
    }

    const items = new ApiItems(new Map(parsed.map((crate) => [crate.name, crate])), impls);

    items.walk(top.root, [], new Set());

    return [...items.found].toSorted();
  }

  /** The public paths of the API crate in `checkout`, whose workspace manifest is `workspace`. */
  public static async read(
    checkout: GitSource,
    workspace: string | undefined,
  ): Promise<readonly string[]> {
    return ApiItems.of(await ApiSources.read(checkout, workspace));
  }

  /** Records every public path below `module`, reached at `prefix`; `chain` keeps a re-export cycle finite. */
  private walk(
    module: RustModule,
    prefix: readonly string[],
    chain: ReadonlySet<RustModule>,
  ): void {
    const inside = new Set([...chain, module]);

    for (const [name, entry] of this.exports(module)) {
      const path = [...prefix, name];
      const joined = path.join(ApiItems.pathSeparator);

      this.found.add(joined);

      for (const member of entry.members) {
        this.found.add(`${joined}${ApiItems.pathSeparator}${member}`);
      }

      for (const child of entry.modules.filter((inner) => !inside.has(inner))) {
        this.walk(child, path, inside);
      }
    }
  }

  /** The names `module` shows: its shown items and what its shown uses bring. */
  private exports(module: RustModule): Map<string, Entry> {
    return this.names(module, this.exportsOf, true);
  }

  /** Every name in `module`, private ones included, as a path inside its crate resolves it. */
  private scope(module: RustModule): Map<string, Entry> {
    return this.names(module, this.scopeOf, false);
  }

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
        members: new Set([...item.members, ...(this.impls.get(item.name) ?? [])]),
      });
    }

    for (const use of module.uses.filter((used) => used.shown || !shownOnly)) {
      const target = this.resolve(module, use.path);

      if (use.name === undefined) {
        this.addGlob(names, target);
      } else {
        // A use the source cannot follow, such as a proc macro, still names something.
        ApiItems.add(names, use.name, target ?? { modules: [], members: new Set() });
      }
    }

    return names;
  }

  /** Adds every name a glob `use` of `target` brings: what its modules show. */
  private addGlob(names: Map<string, Entry>, target: Entry | undefined): void {
    for (const glob of target?.modules ?? []) {
      for (const [name, entry] of this.exports(glob)) {
        ApiItems.add(names, name, entry);
      }
    }
  }

  /** What a `use` path reaches from `module`, or `undefined` when the source cannot follow it. */
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

      entry = inner ?? (entry.members.has(name) ? { modules: [], members: new Set() } : undefined);
    }

    return entry;
  }

  /** What the first name of a `use` path reaches from `module`. */
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

  private static entryOf(module: RustModule | undefined): Entry | undefined {
    return module === undefined ? undefined : { modules: [module], members: new Set() };
  }

  /** Adds `entry` under `name`, beside what the name reaches in another namespace. */
  private static add(names: Map<string, Entry>, name: string, entry: Entry): void {
    const known = names.get(name);

    if (known === undefined) {
      names.set(name, { modules: [...entry.modules], members: new Set(entry.members) });

      return;
    }

    known.modules.push(...entry.modules.filter((module) => !known.modules.includes(module)));

    for (const member of entry.members) {
      known.members.add(member);
    }
  }
}
