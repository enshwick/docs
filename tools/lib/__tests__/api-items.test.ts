import { describe, expect, it } from 'vitest';

import { ApiItems } from '../api-items.ts';
import type { GitSource } from '../git-source.ts';

const crate = (files: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(files));

/** Every public path of `root` among `crates`. */
const pathsOf = async (
  crates: ReadonlyMap<string, ReadonlyMap<string, string>>,
  root?: string,
): Promise<readonly string[]> => (await ApiItems.of(crates, root)).all;

/** An API crate re-exporting an internal crate's module whole, as `enshwick` does. */
const workspace = new Map([
  [
    'enshwick',
    crate({
      'lib.rs': `
        pub use enshwick_base::inventory;
        pub use enshwick_base::config::{self as config};
        pub use enshwick_core::{Load, Off};
        pub use enshwick_macros::Config;
        #[doc(hidden)]
        pub use enshwick_base::__private;
        #[cfg(test)]
        mod tests { pub fn only_in_tests() {} }
      `,
    }),
  ],
  [
    'enshwick_base',
    crate({
      'lib.rs':
        'pub mod inventory;\npub mod config;\npub mod __private;\nmod events;\npub use events::*;',
      'inventory.rs': `
        mod containers;
        pub use containers::{Container, ContainerRule as Rule};
        pub struct Inventories { pub slots: u32, hidden: u32 }
        impl Inventories {
            pub fn give(&self) {}
            fn internal(&self) {}
        }
        impl Clone for Inventories { fn clone(&self) -> Self { todo!() } }
        pub enum Op { Give, Take { count: u32 } }
        pub(crate) fn crate_only() {}
      `,
      'inventory/containers.rs': 'pub struct Container;\npub struct ContainerRule;\n',
      'config/mod.rs': 'pub fn set() {}\npub mod nested { pub const LIMIT: u32 = 1; }',
      '__private.rs': 'pub fn support() {}',
      'events.rs': `
        macro_rules! without_data {
            ($($(#[$doc:meta])* $name:ident = $event:ident;)*) => { $( pub struct $name; )* };
        }
        without_data! {
            /// [\`Event::WORLD_LOADED\`].
            WorldLoaded = WORLD_LOADED;
            #[cfg(feature = "unstable")]
            AltarsChanged = ALTARS_CHANGED;
        }
        #[macro_export]
        macro_rules! debug { () => {} }
      `,
    }),
  ],
  [
    'enshwick_core',
    crate({
      'lib.rs': 'mod load;\npub use load::{Load, Off};',
      'load.rs': `
        pub struct Load<'a>(&'a ());
        pub struct Off;
        #[forward(base)]
        impl Load<'_> {
            pub fn container_rule(&mut self) -> Result<(), Off>;
            pub(crate) fn hidden(&self) {}
        }
      `,
    }),
  ],
]);

describe('ApiItems', () => {
  it('lists every public path the API crate shows, through each re-export', async () => {
    const items = await pathsOf(workspace);

    expect(items).toEqual(
      expect.arrayContaining([
        'inventory',
        'inventory::Container',
        'inventory::Rule',
        'inventory::Inventories',
        'inventory::Inventories::slots',
        'inventory::Inventories::give',
        'inventory::Inventories::clone',
        'inventory::Op::Give',
        'inventory::Op::Take',
        'config',
        'config::set',
        'config::nested::LIMIT',
        'Load',
        'Load::container_rule',
        'Off',
        'Config',
      ]),
    );
  });

  it('leaves out private, crate-only, hidden and test-only items', async () => {
    const items = await pathsOf(workspace);

    for (const absent of [
      'inventory::containers',
      'inventory::ContainerRule',
      'inventory::Inventories::hidden',
      'inventory::Inventories::internal',
      'inventory::crate_only',
      'Load::hidden',
      '__private',
      'tests',
      'container_rule',
    ]) {
      expect({ absent, listed: items.includes(absent) }).toEqual({ absent, listed: false });
    }
  });

  it('reads the items a local macro declares and the macros a crate exports', async () => {
    const base = await pathsOf(workspace, 'enshwick_base');

    expect(base).toEqual(expect.arrayContaining(['WorldLoaded', 'AltarsChanged', 'debug']));
  });

  it('gives a type only the members of impl blocks for that type, not for one of the same name elsewhere', async () => {
    const items = await pathsOf(
      new Map([
        [
          'enshwick',
          crate({
            'lib.rs': `
              pub mod items { pub struct Kind; impl Kind { pub fn can_refuse(&self) {} } }
              pub mod events {
                  pub struct Kind;
                  mod imp { use super::Kind; impl Kind { pub fn of_word() {} } }
              }
            `,
          }),
        ],
      ]),
    );

    expect(items).toEqual(
      expect.arrayContaining(['items::Kind::can_refuse', 'events::Kind::of_word']),
    );
    expect(items).not.toContain('events::Kind::can_refuse');
    expect(items).not.toContain('items::Kind::of_word');
  });

  it('reads a glob of an enum’s variants and a declaring macro called with parentheses', async () => {
    const items = await pathsOf(
      new Map([
        [
          'enshwick',
          crate({
            'lib.rs': `
              macro_rules! decl { ($($name:ident;)*) => { $(pub struct $name;)* } }
              pub enum Op { Give, Take }
              pub use Op::*;
              decl!(Alpha; Beta;);
              decl! { Gamma; }
            `,
          }),
        ],
      ]),
    );

    expect(items).toEqual(
      expect.arrayContaining(['Give', 'Take', 'Alpha', 'Beta', 'Gamma', 'Op::Give']),
    );
  });

  it('resolves a use through a name a later use of the same module brings', async () => {
    const items = await pathsOf(
      new Map([
        [
          'enshwick',
          crate({
            'lib.rs': `
              pub use inner::Thing;
              use deep as inner;
              mod deep { pub struct Thing; impl Thing { pub fn go(&self) {} } }
              pub mod child { pub use super::Thing; }
            `,
          }),
        ],
      ]),
    );

    expect(items).toEqual(expect.arrayContaining(['Thing::go', 'child::Thing::go']));
  });

  it('refuses a crate list without the API crate', async () => {
    await expect(ApiItems.of(new Map())).rejects.toThrow('no source of crate enshwick');
  });

  it('reads the API crate and the internal crates it depends on from a checkout', async () => {
    const files: Record<string, string> = {
      'crates/enshwick/Cargo.toml':
        '[dependencies]\nenshwick-base.workspace = true\nenshwick-macros = { path = "../internal/macros" }\nserde.workspace = true\n',
      'crates/enshwick/src/lib.rs':
        'pub use enshwick_base::inventory;\npub use enshwick_macros::Config;',
      'crates/internal/base/Cargo.toml': '[dependencies]\nenshwick-values.workspace = true\n',
      'crates/internal/base/src/lib.rs': 'pub mod inventory;',
      'crates/internal/base/src/inventory.rs': 'pub use enshwick_values::Count;',
      'crates/internal/values/Cargo.toml': '',
      'crates/internal/values/src/lib.rs': 'pub struct Count;',
      'crates/internal/macros/Cargo.toml': '',
      'crates/internal/macros/src/lib.rs':
        '#[proc_macro_derive(Config)]\npub fn derive_config() {}',
    };
    const widened: string[] = [];
    // The tests read from a map, not from a sparse clone of the repository.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const checkout = {
      widen: (paths: readonly string[]) => {
        widened.push(...paths);

        return Promise.resolve();
      },
      read: (path: string) => Promise.resolve(files[path]),
      glob: (pattern: string) => {
        const folder = pattern.slice(0, pattern.indexOf('/src/'));

        return Promise.resolve(
          Object.keys(files).filter((path) => path.startsWith(`${folder}/src/`)),
        );
      },
    } as unknown as GitSource;
    const workspaceManifest =
      '[workspace.dependencies]\nenshwick-base = { path = "crates/internal/base" }\nenshwick-values = { path = "crates/internal/values" }\n';

    expect((await ApiItems.read(checkout, workspaceManifest)).all).toEqual([
      'Config',
      'inventory',
      'inventory::Count',
    ]);
    expect(widened).toContain('/crates/internal/macros/src/');
  });
});
