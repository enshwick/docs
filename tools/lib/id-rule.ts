import { ModId } from '../../src/site/types.ts';

/** One example of the API crate's id rule: the id and whether it is accepted. */
export interface IdExample {
  readonly id: string;
  readonly accepted: boolean;
}

/**
 * Holds the site's mod id type to the API crate's own rule: every example in the documentation of
 * `is_valid_id` must get the same answer from {@link ModId}.
 */
export class IdRule {
  private static readonly example = /assert!\((!?)is_valid_id\("([^"]*)"\)\)/gu;

  private constructor(public readonly examples: readonly IdExample[]) {}

  /** The examples in the API crate's `abi.rs`. */
  public static of(abi: string): IdRule {
    return new IdRule(
      [...abi.matchAll(IdRule.example)].map((match) => ({
        id: match[2] ?? '',
        accepted: match[1] !== '!',
      })),
    );
  }

  /** The examples the site's type answers differently, as readable lines. */
  public get disagreements(): readonly string[] {
    return this.examples
      .filter(({ id, accepted }) => ModId.accepts(id) !== accepted)
      .map(({ id, accepted }) => `is_valid_id("${id}") is ${accepted} in the API crate`);
  }
}
