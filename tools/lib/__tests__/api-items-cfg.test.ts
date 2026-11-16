import { describe, expect, it } from 'vitest';

import { ApiItems } from '../api-items.ts';

const crate = (files: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(files));

/** Every public path of the crates' API crate. */
const paths = async (
  crates: ReadonlyMap<string, ReadonlyMap<string, string>>,
): Promise<readonly string[]> => (await ApiItems.of(crates)).all;

describe('ApiItems and cfg', () => {
  it('keeps an attribute in force across a doc comment, and leaves out items only a test build has', async () => {
    const items = await paths(
      new Map([
        [
          'enshwick',
          crate({
            'lib.rs': `
              #[doc(hidden)]
              /// Support.
              pub fn hidden_helper() {}
              #[cfg(all(test, windows))]
              pub mod win_tests { pub fn t() {} }
              #[cfg(any(test, doctest))]
              pub fn any_test() {}
              #[cfg(not(test))]
              pub fn not_test() {}
              #[cfg(any(test, feature = "test"))]
              pub fn test_feature() {}
            `,
          }),
        ],
      ]),
    );

    expect(items).toEqual(['not_test', 'test_feature']);
  });

  it('names the paths only the unstable feature compiles: in a gated module, item, use or impl', async () => {
    const { unstable } = await ApiItems.of(
      new Map([
        [
          'enshwick',
          crate({
            'lib.rs': `
              pub mod world;
              #[cfg(feature = "unstable")]
              pub fn edit() {}
              #[cfg(all(feature = "unstable", windows))]
              pub use world::World as GatedWorld;
            `,
            'world.rs': `
              pub struct World;
              impl World { pub fn players(&self) {} }
              #[cfg(feature = "unstable")]
              mod props;
              #[cfg(feature = "unstable")]
              impl World { pub fn capture(&self) {} }
              #[cfg(any(feature = "unstable", test))]
              pub struct Prop;
            `,
            'world/props.rs': 'impl super::World { pub fn props_in(&self) {} }',
          }),
        ],
      ]),
    );

    expect(unstable).toEqual([
      'GatedWorld',
      'GatedWorld::capture',
      'GatedWorld::players',
      'GatedWorld::props_in',
      'edit',
      'world::World::capture',
      'world::World::props_in',
    ]);
  });
});
