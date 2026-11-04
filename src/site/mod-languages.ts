import modLanguagesData from '../data/mod-languages.json' with { type: 'json' };
import { ModLanguageKeys } from './mod-language-keys.ts';
import { FenceName, ModLanguageEntry } from './types.ts';

/**
 * The languages mods are written in, read once from `src/data/mod-languages.json`. Developer pages
 * show one of them at a time: code for one thing in several languages as synced tabs, and blocks
 * marked for one language only while it is the chosen one.
 */
export class ModLanguages {
  private static readonly schema = ModLanguageEntry.array({ min: 1 });

  /** The mod languages, as `src/data/mod-languages.json` lists them. */
  public static readonly site = new ModLanguages(modLanguagesData);

  public readonly all: ReadonlyArray<{ label: string; fences: readonly FenceName[] }>;

  public constructor(data: unknown) {
    const parsed = ModLanguages.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/mod-languages.json: ${JSON.stringify(parsed.issues)}`);
    }

    this.all = parsed.value.map((entry) => ({
      label: entry.label.toString(),
      fences: entry.fences,
    }));

    const labels = this.all.map((language) => language.label);
    const fences = this.all.flatMap((language) => language.fences.map((fence) => fence.value));

    if (new Set(labels).size !== labels.length || new Set(fences).size !== fences.length) {
      throw new TypeError(
        'src/data/mod-languages.json: each label and each fence names one language',
      );
    }
  }

  /** The language a reader sees before choosing one: the first listed. */
  public get fallback(): string {
    const first = this.all[0];

    if (first === undefined) {
      throw new TypeError('no mod language');
    }

    return first.label;
  }

  /** Where the language `label` stands in the list, so tabs follow the list's order. */
  public rank(label: string): number {
    return this.all.findIndex((language) => language.label === label);
  }

  /** The label of the language whose code fences say `fence`, or nothing for another language. */
  public labelOf(fence: string): string | undefined {
    const parsed = FenceName.parse(fence);

    if (!parsed.ok) {
      return undefined;
    }

    return this.all.find((language) => language.fences.some((known) => known.equals(parsed.value)))
      ?.label;
  }

  /**
   * The rules that hide every block marked for a language other than the chosen one. A choice no
   * language has, or none at all without scripts, hides nothing.
   */
  public get css(): string {
    const root = ModLanguageKeys.rootAttribute;
    const only = ModLanguageKeys.onlyAttribute;

    return this.all
      .map(
        ({ label }) =>
          `:root[${root}="${label}"] [${only}]:not([${only}="${label}"]) { display: none; }`,
      )
      .join('\n');
  }
}
