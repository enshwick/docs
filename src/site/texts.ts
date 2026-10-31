import { AnyString, n } from '@horizon-republic/nominal-types';

import textsData from '../data/texts.json' with { type: 'json' };
import { Languages } from './languages.ts';
import { LanguageCode, TextKey } from './types.ts';

/** The site's own short texts, from `src/data/texts.json`, one entry per key and language. */
export class Texts {
  private static readonly schema = n.record(TextKey, n.record(LanguageCode, AnyString));

  /** The site's texts, as `src/data/texts.json` holds them. */
  public static readonly site = new Texts(textsData, Languages.site);

  private readonly entries: ReadonlyMap<string, ReadonlyMap<string, string>>;

  public constructor(
    data: unknown,
    private readonly siteLanguages: Languages,
  ) {
    const parsed = Texts.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/texts.json: ${JSON.stringify(parsed.issues)}`);
    }

    this.entries = new Map(
      Object.entries(parsed.value).map(([key, byLanguage]) => [
        key,
        new Map(Object.entries(byLanguage).map(([code, text]) => [code, text.toString()])),
      ]),
    );
  }

  /** Every key, in file order. */
  public get keys(): readonly string[] {
    return [...this.entries.keys()];
  }

  /** The text in a language, or in the root language where that one has none. */
  public get(key: string, language: LanguageCode = this.siteLanguages.root): string {
    const byLanguage = this.entries.get(key);
    const text =
      byLanguage?.get(language.toString()) ?? byLanguage?.get(this.siteLanguages.root.toString());

    if (text === undefined) {
      throw new TypeError(`src/data/texts.json has no "${key}"`);
    }

    return text;
  }

  /** Whether the key has its own text in that language. */
  public has(key: string, language: LanguageCode): boolean {
    return this.entries.get(key)?.has(language.toString()) === true;
  }

  /** The text in every language other than the root, the shape Starlight's `translations` takes. */
  public translations(key: string): Record<string, string> {
    return Object.fromEntries(
      this.siteLanguages.others.map((code) => [code.toString(), this.get(key, code)]),
    );
  }

  /** The text in every language, the root included, keyed by language code. */
  public everyLanguage(key: string): Record<string, string> {
    return Object.fromEntries(
      this.siteLanguages.all.map(({ code }) => [code.toString(), this.get(key, code)]),
    );
  }
}
