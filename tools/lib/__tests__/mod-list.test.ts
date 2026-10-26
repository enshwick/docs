import { describe, expect, it } from 'vitest';

import { ModPages } from '../mod-pages.ts';

const list = `
[[mod]]
package = "enshwick-area-loot"
repository = "enshwick/mod-area-loot"

[[mod]]
package = "enshwick-better-altars"
repository = "enshwick/mod-better-altars"
`;

describe('ModPages.listed', () => {
  it("takes the mods from the platform's list, in its order", () => {
    expect(ModPages.listed('tools/mods.toml', list).map((name) => name.toString())).toEqual([
      'enshwick/mod-area-loot',
      'enshwick/mod-better-altars',
    ]);
  });

  it('refuses a missing or broken list', () => {
    expect(() => ModPages.listed('tools/mods.toml')).toThrow(/tools\/mods.toml/u);
    expect(() => ModPages.listed('tools/mods.toml', '[[mod]]\npackage = "x"\n')).toThrow(
      /tools\/mods.toml/u,
    );
  });
});
