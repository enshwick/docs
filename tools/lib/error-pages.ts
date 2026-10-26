import { ErrorCode, ErrorsSource } from '../../src/site/errors.ts';
import { PageFile } from './page-file.ts';

/** The parsed `errors.toml`. */
type Errors = NonNullable<Extract<ReturnType<typeof ErrorsSource.parse>, { ok: true }>['value']>;

/** A page per loader error code at `/errors/<code>/`, and the "game won't start" steps as the folder's index. */
export class ErrorPages {
  public static readonly folder = 'errors';

  private constructor(private readonly errors: Errors) {}

  /** Reads the loader's `errors.toml`. */
  public static parse(origin: string, text: string): ErrorPages {
    const parsed = ErrorsSource.parse(Bun.TOML.parse(text));

    if (!parsed.ok) {
      throw new TypeError(`${origin}: ${JSON.stringify(parsed.issues)}`);
    }

    return new ErrorPages(parsed.value);
  }

  /** The pages: one per code, and the index when the source has steps. */
  public pages(): PageFile[] {
    const codes = this.errors.error.map(
      (error) =>
        new PageFile(
          `${ErrorPages.folder}/${error.code.slug}`,
          {
            title: `${error.code}: ${error.title}`,
            description: error.cause.toString(),
            type: 'reference',
            editUrl: false,
            sidebar: { label: error.code.toString() },
          },
          `## Why it happens\n\n${error.cause}\n\n## What to do\n\n${error.fix}\n`,
        ),
    );
    const steps = this.errors.step ?? [];

    if (steps.length === 0) {
      return codes;
    }

    return [
      new PageFile(
        `${ErrorPages.folder}/index`,
        {
          title: "The game won't start",
          description:
            'Answer a few questions to find the error that stops your game, and its fix.',
          type: 'how-to',
          editUrl: false,
          sidebar: { order: 0 },
        },
        this.decisionTree(),
      ),
      ...codes,
    ];
  }

  /** The steps as sections, each answer a link to the next step or to an error's page. */
  public decisionTree(): string {
    const steps = this.errors.step ?? [];
    const target = (answer: string): string => {
      const code = ErrorCode.parse(answer);
      const next = steps.findIndex((step) => step.id.toString() === answer) + 1;

      return code.ok
        ? `[${code.value}: ${this.title(code.value)}](/${ErrorPages.folder}/${code.value.slug}/)`
        : `[go to question ${next}](#${answer})`;
    };

    return [
      'Start with the first question and follow your answers.',
      ...steps.map(
        (step, index) =>
          `<span id="${step.id}"></span>\n\n## ${index + 1}. ${step.question}\n\n- Yes: ${target(step.yes.toString())}\n- No: ${target(step.no.toString())}`,
      ),
    ].join('\n\n');
  }

  private title(code: ErrorCode): string {
    return this.errors.error.find((error) => error.code.equals(code))?.title.toString() ?? '';
  }
}
