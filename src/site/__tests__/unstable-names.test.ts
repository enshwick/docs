import { describe, expect, it } from 'vitest';

import { UnstableNames } from '../unstable-names.ts';

describe('UnstableNames', () => {
  it('marks a full path unstable by the name the book gives it from the path’s first type', () => {
    const unstable = new UnstableNames(['Field::MaxStackSize', 'Damage', 'events::PlayerDied']);

    expect(unstable.has('content::changes::Field::MaxStackSize')).toBe(true);
    expect(unstable.has('damage::Damage::scale')).toBe(true);
    expect(unstable.has('events::PlayerDied')).toBe(true);
    expect(unstable.has('content::changes::Field::Slots')).toBe(false);
  });

  it('starts no match at a type after the path’s first, such as a variant the book names alike', () => {
    const unstable = new UnstableNames(['Damage', 'Interaction::moved']);

    expect(unstable.has('stats::StatGroup::Damage')).toBe(false);
    expect(unstable.has('abi::Hit::Interaction::moved')).toBe(false);
    expect(unstable.has('damage::Damage')).toBe(true);
  });

  it('marks no path by an inner module the book names alone', () => {
    const unstable = new UnstableNames(['items']);

    expect(unstable.has('world::World::items')).toBe(false);
    expect(unstable.has('content::items::Foo')).toBe(false);
    expect(unstable.has('items::Kind')).toBe(true);
  });
});
