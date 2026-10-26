import { AnyString, n } from '@horizon-republic/nominal-types';

/** A loader error code: `E` and four digits, the first naming the area. */
export class ErrorCode extends AnyString.subtype('docs.ErrorCode', /^E\d{4}$/u) {
  /** The page's slug under `errors/`: the code in lower case. */
  public get slug(): string {
    return this.value.toLowerCase();
  }
}

/** A step of "the game won't start", by its id. */
export class StepId extends AnyString.subtype('docs.StepId', /^[a-z0-9-]+$/u) {}

/**
 * The loader's `errors.toml`: every code its messages carry, and the steps of "the game won't
 * start", each answer leading to another step or a code.
 */
export const ErrorsSource = n.object({
  error: n.object({ code: ErrorCode, title: AnyString, cause: AnyString, fix: AnyString }).array(),
  step: n
    .object({ id: StepId, question: AnyString, yes: AnyString, no: AnyString })
    .array()
    .optional(),
});
