import { AnyString, n } from '@horizon-republic/nominal-types';

import { LanguageCode } from './types.ts';

/** A loader error code: `E` and four digits, the first naming the area. */
export class ErrorCode extends AnyString.subtype('docs.ErrorCode', /^E\d{4}$/u) {
  /** The page's slug under `errors/`: the code in lower case. */
  public get slug(): string {
    return this.value.toLowerCase();
  }
}

/** A step of "the game won't start", by its id. */
export class StepId extends AnyString.subtype('docs.StepId', /^[a-z0-9-]+$/u) {}

/** What an error's page says, in one language. */
const ErrorText = n.object({ title: AnyString, cause: AnyString, fix: AnyString });

/** What a step asks, in one language. */
const StepText = n.object({ question: AnyString });

/**
 * The loader's `errors.toml`: every code its messages carry, and the steps of "the game won't
 * start", each answer leading to another step or a code. The texts are in the root language,
 * with the others under `translations`, keyed by language code.
 */
export const ErrorsSource = n.object({
  error: ErrorText.extend({
    code: ErrorCode,
    translations: n.record(LanguageCode, ErrorText).optional(),
  }).array(),
  step: StepText.extend({
    id: StepId,
    yes: AnyString,
    no: AnyString,
    translations: n.record(LanguageCode, StepText).optional(),
  })
    .array()
    .optional(),
});
