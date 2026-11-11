import { describe, expect, it } from 'vitest';

import { ApiMap } from '../api-map.ts';

const lib = `//! The crate.
pub mod stats;
pub mod raw;
mod host;
#[doc(hidden)]
pub mod __private;
#[cfg(feature = "test")]
#[doc(hidden)]
pub mod fixtures;
#[cfg(feature = "unstable")]
pub mod weather;
`;

const pages = [
  {
    slug: 'dev/stats',
    title: 'Stats',
    body: 'See [stats](https://x/crates/enshwick/src/stats.rs).',
  },
  { slug: 'dev/world', title: 'The world', body: '```rust\nlet r = enshwick::raw::read();\n```' },
];

describe('ApiMap', () => {
  it('maps each public module to the pages that link its source or use its path', () => {
    const map = ApiMap.of(lib, pages);

    expect(map.modules.map((module) => module.name)).toEqual(['stats', 'raw', 'weather']);
    expect(map.modules[0]?.pages.map((page) => page.slug)).toEqual(['dev/stats']);
    expect(map.modules[1]?.pages.map((page) => page.slug)).toEqual(['dev/world']);
  });

  it('counts a page that names the module by its crate path', () => {
    const named = [{ slug: 'dev/luau', title: 'Luau', body: 'Read from `enshwick::weather`.' }];

    expect(ApiMap.of(lib, named).modules[2]?.pages.map((page) => page.slug)).toEqual(['dev/luau']);
  });

  it('names the modules no page covers', () => {
    expect(ApiMap.of(lib, pages).uncovered).toEqual(['weather']);
  });

  it('leaves out modules hidden from the docs, under any other attributes', () => {
    const names = ApiMap.of(lib, pages).modules.map((module) => module.name);

    expect(names).not.toContain('__private');
    expect(names).not.toContain('fixtures');
  });

  it('names the public modules the crate compiles only with the unstable feature', () => {
    expect(ApiMap.of(lib, pages).gated).toEqual(['weather']);
  });

  it('counts a module re-exported whole from an internal crate, but not a macro or a hidden one', () => {
    const recut = `#[doc(inline)]
pub use enshwick_values::shape;
pub use enshwick_macros::hook;
pub use enshwick_macros::Shape;
#[doc(hidden)]
pub use enshwick_core::internals;
pub use abi::{Entity, ItemId};
pub mod stats;
`;

    expect(ApiMap.of(recut, pages).modules.map((module) => module.name)).toEqual([
      'shape',
      'stats',
    ]);
  });

  it('counts a module re-exported alone with {self} beside a macro of the same name', () => {
    const recut = 'pub use enshwick_base::config::{self};\npub use enshwick_macros::config;\n';

    expect(ApiMap.of(recut, pages).modules.map((module) => module.name)).toEqual(['config']);
    expect(ApiMap.origin(recut, 'config')).toBe('enshwick_base');
  });

  it('names the internal crate a module is re-exported from', () => {
    const recut = 'pub use enshwick_abi::abi;\npub mod stats;\n';

    expect(ApiMap.origin(recut, 'abi')).toBe('enshwick_abi');
    expect(ApiMap.origin(recut, 'stats')).toBeUndefined();
  });

  it('writes one line per module with absolute links', () => {
    expect(ApiMap.of(lib, pages).markdown('https://site/docs')).toContain(
      '- `enshwick::stats`: [Stats](https://site/docs/dev/stats/)',
    );
  });
});
