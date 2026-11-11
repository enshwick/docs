import { ErrorCode, ErrorsSource } from '../../src/site/errors.ts';
import { Languages } from '../../src/site/languages.ts';
import { Texts } from '../../src/site/texts.ts';
import type { LanguageCode } from '../../src/site/types.ts';
import { MetaDescription } from './meta-description.ts';
import { PageFile } from './page-file.ts';

/** The parsed `errors.toml`. */
type Errors = NonNullable<Extract<ReturnType<typeof ErrorsSource.parse>, { ok: true }>['value']>;
type ErrorEntry = Errors['error'][number];
type StepEntry = NonNullable<Errors['step']>[number];
type ErrorText = Pick<ErrorEntry, 'title' | 'cause' | 'fix'>;
type StepText = Pick<StepEntry, 'question'>;

/** The loader's `errors.toml` of one platform version, with the path the version keeps it at. */
export interface ErrorsFile {
  readonly source: string;
  readonly text: string;
}

/**
 * A page per loader error code at `/errors/<code>/`, and the "game won't start" steps as the
 * folder's index, in every site language the source translates them to.
 */
export class ErrorPages {
  public static readonly folder = 'errors';
  /** A title that already ends as a sentence, so its description adds no period. */
  private static readonly closed = /[.!?]$/u;

  private static readonly text = {
    why: 'error.why',
    fix: 'error.fix',
    title: 'errors.title',
    description: 'errors.description',
    start: 'errors.start',
    yes: 'errors.yes',
    no: 'errors.no',
    next: 'errors.next',
  } as const;

  /** Where each layout of the platform keeps the loader's `errors.toml`, the newest layout first. */
  public static readonly sources = [
    'crates/runtime/loader/src/errors.toml',
    'crates/internal/loader/src/errors.toml',
  ];

  private constructor(private readonly errors: Errors) {}

  /** The `errors.toml` at the first of `sources` a version has, or `undefined` when it has none. */
  public static async locate(
    read: (path: string) => Promise<string | undefined>,
  ): Promise<ErrorsFile | undefined> {
    const texts = await Promise.all(ErrorPages.sources.map(read));
    const index = texts.findIndex((text) => text !== undefined);
    const text = texts[index];
    const source = ErrorPages.sources[index];

    return text === undefined || source === undefined ? undefined : { source, text };
  }

  /** Reads the loader's `errors.toml`. */
  public static parse(origin: string, text: string): ErrorPages {
    const parsed = ErrorsSource.parse(Bun.TOML.parse(text));

    if (!parsed.ok) {
      throw new TypeError(`${origin}: ${JSON.stringify(parsed.issues)}`);
    }

    return new ErrorPages(parsed.value);
  }

  /**
   * The pages, dated by the source's last change: in each language, one per code it translates,
   * and the index when the source has steps and translates them all. A page left out falls back
   * to the root language's.
   */
  public pages(lastUpdated?: Date): PageFile[] {
    return Languages.site.all.flatMap(({ code }) => this.pagesIn(code, lastUpdated));
  }

  /** Each code and step without its text in a site language, as `<code or step> <language>`. */
  public missing(): string[] {
    return Languages.site.others.flatMap((language) => [
      ...this.errors.error
        .filter((error) => ErrorPages.errorIn(error, language) === undefined)
        .map((error) => `${error.code} ${language}`),
      ...(this.errors.step ?? [])
        .filter((step) => ErrorPages.stepIn(step, language) === undefined)
        .map((step) => `${step.id} ${language}`),
    ]);
  }

  /** Every code with its page, cause and fix: the JSON index the loader's messages and tools read. */
  public index(): Array<{ code: string; title: string; cause: string; fix: string; page: string }> {
    return this.errors.error.map((error) => ({
      code: error.code.toString(),
      title: error.title.toString(),
      cause: error.cause.toString(),
      fix: error.fix.toString(),
      page: `/${ErrorPages.folder}/${error.code.slug}/`,
    }));
  }

  /** The steps as sections, each answer a link to the next step or to an error's page. */
  public decisionTree(language: LanguageCode = Languages.site.root): string {
    const steps = this.errors.step ?? [];
    const text = (key: string): string => Texts.site.get(key, language);

    const target = (answer: string): string => {
      const code = ErrorCode.parse(answer);
      const next = steps.findIndex((step) => step.id.toString() === answer) + 1;

      return code.ok
        ? `[${code.value}: ${ErrorPages.escaped(this.title(code.value, language))}](/${ErrorPages.folderIn(language)}/${code.value.slug}/)`
        : `[${text(ErrorPages.text.next)} ${next}](#${answer})`;
    };

    return [
      text(ErrorPages.text.start),
      ...steps.map(
        (step, index) =>
          `<span id="${step.id}"></span>\n\n## ${index + 1}. ${ErrorPages.escaped((ErrorPages.stepIn(step, language) ?? step).question)}\n\n- ${text(ErrorPages.text.yes)}: ${target(step.yes.toString())}\n- ${text(ErrorPages.text.no)}: ${target(step.no.toString())}`,
      ),
    ].join('\n\n');
  }

  private pagesIn(language: LanguageCode, lastUpdated?: Date): PageFile[] {
    const folder = ErrorPages.folderIn(language);
    const text = (key: string): string => Texts.site.get(key, language);
    const codes = this.errors.error.flatMap((error) => {
      const page = ErrorPages.errorIn(error, language);

      return page === undefined
        ? []
        : [
            new PageFile(
              `${folder}/${error.code.slug}`,
              {
                title: `${error.code}: ${page.title}`,
                description: ErrorPages.description(error.code, page),
                type: 'reference',
                editUrl: false,
                sidebar: { label: error.code.toString() },
                error: { code: error.code.toString() },
              },
              `## ${text(ErrorPages.text.why)}\n\n${ErrorPages.escaped(page.cause)}\n\n## ${text(ErrorPages.text.fix)}\n\n${ErrorPages.escaped(page.fix)}\n`,
              lastUpdated,
            ),
          ];
    });
    const steps = this.errors.step ?? [];

    if (
      steps.length === 0 ||
      steps.some((step) => ErrorPages.stepIn(step, language) === undefined)
    ) {
      return codes;
    }

    return [
      new PageFile(
        `${folder}/index`,
        {
          title: text(ErrorPages.text.title),
          description: text(ErrorPages.text.description),
          type: 'how-to',
          editUrl: false,
          sidebar: { order: 0 },
        },
        this.decisionTree(language),
        lastUpdated,
      ),
      ...codes,
    ];
  }

  /** A code page's meta description: its code and title, then its cause and fix while they fit. */
  private static description(code: ErrorCode, page: ErrorText): string {
    const title = page.title.toString();

    return MetaDescription.pack([
      ErrorPages.closed.test(title) ? `${code}: ${title}` : `${code}: ${title}.`,
      page.cause.toString(),
      page.fix.toString(),
    ]);
  }

  /** The folder of a language's pages: `errors` for the root, `<language>/errors` for the others. */
  private static folderIn(language: LanguageCode): string {
    return language.equals(Languages.site.root)
      ? ErrorPages.folder
      : `${language}/${ErrorPages.folder}`;
  }

  /** A source text as Markdown shows it literally: its `<save>` and `<date>` are no HTML tags. */
  private static escaped(text: { toString(): string }): string {
    return text.toString().replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  private static errorIn(error: ErrorEntry, language: LanguageCode): ErrorText | undefined {
    return language.equals(Languages.site.root) ? error : error.translations?.[language.toString()];
  }

  private static stepIn(step: StepEntry, language: LanguageCode): StepText | undefined {
    return language.equals(Languages.site.root) ? step : step.translations?.[language.toString()];
  }

  private title(code: ErrorCode, language: LanguageCode): string {
    const error = this.errors.error.find((entry) => entry.code.equals(code));

    return error === undefined
      ? ''
      : (ErrorPages.errorIn(error, language) ?? error).title.toString();
  }
}
