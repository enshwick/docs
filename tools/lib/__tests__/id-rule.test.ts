import { describe, expect, it } from 'vitest';

import { FormerModId, ModId } from '../../../src/site/types.ts';
import { IdRule } from '../id-rule.ts';

const abi = `
/// assert!(is_valid_id("you.trading-post"));
/// assert!(!is_valid_id("trading-post"));
/// assert!(!is_valid_id("you.trading.post"));
/// assert!(!is_valid_id("You.Trading Post"));
/// assert!(is_valid_former_id("trading-post"));
/// assert!(is_valid_former_id("you.trading-post"));
/// assert!(!is_valid_former_id("Trading Post"));
`;

describe('IdRule', () => {
  it("reads the API crate's examples", () => {
    expect(IdRule.of(abi).examples).toHaveLength(7);
  });

  it('agrees with every example', () => {
    expect(IdRule.of(abi).disagreements).toEqual([]);
  });

  it('reports an example the types answer differently', () => {
    expect(IdRule.of('assert!(is_valid_id("bare"));').disagreements).toEqual([
      'is_valid_id("bare") is true in the API crate',
    ]);
  });

  it('holds the 64-character limit and the empty parts', () => {
    expect(ModId.accepts(`a.${'b'.repeat(62)}`)).toBe(true);
    expect(ModId.accepts(`a.${'b'.repeat(63)}`)).toBe(false);
    expect(ModId.accepts('.name')).toBe(false);
    expect(ModId.accepts('author.')).toBe(false);
    expect(FormerModId.accepts('a'.repeat(65))).toBe(false);
  });
});
