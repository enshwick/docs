import { FormerModId, ModId } from '../../src/site/types.ts';

/** One example of the API crate's id rules: the function, the id and whether it is accepted. */
export interface IdExample {
  readonly rule: 'is_valid_id' | 'is_valid_former_id';
  readonly id: string;
  readonly accepted: boolean;
}

/**
 * Holds the site's mod id types to the API crate's own rules: every example in the documentation of
 * `is_valid_id` and `is_valid_former_id` must get the same answer from {@link ModId} and
 * {@link FormerModId}.
 */
export class IdRule {
  private static readonly example =
    /assert!\((!?)(is_valid_id|is_valid_former_id)\("([^"]*)"\)\)/gu;

  private constructor(public readonly examples: readonly IdExample[]) {}

  /** The examples in the API crate's `abi.rs`. */
  public static of(abi: string): IdRule {
    return new IdRule(
      [...abi.matchAll(IdRule.example)].map((match) => ({
        rule: match[2] === 'is_valid_id' ? 'is_valid_id' : 'is_valid_former_id',
        id: match[3] ?? '',
        accepted: match[1] !== '!',
      })),
    );
  }

  /** The examples the site's types answer differently, as readable lines. */
  public get disagreements(): readonly string[] {
    return this.examples
      .filter(
        ({ rule, id, accepted }) =>
          (rule === 'is_valid_id' ? ModId.accepts(id) : FormerModId.accepts(id)) !== accepted,
      )
      .map(({ rule, id, accepted }) => `${rule}("${id}") is ${accepted} in the API crate`);
  }
}
