import languagesData from '../data/languages.json' with { type: 'json' };
import { LanguageCode, LanguageEntry } from './types.ts';

/** The site's languages, read once from `src/data/languages.json`; the first marked default is the root. */
export class Languages {
  private static readonly schema = LanguageEntry.array({ min: 1 });

  /** The site's languages, as `src/data/languages.json` lists them. */
  public static readonly site = new Languages(languagesData);

  public readonly all: ReadonlyArray<{ code: LanguageCode; label: string; isDefault: boolean }>;

  public constructor(data: unknown) {
    const parsed = Languages.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/languages.json: ${JSON.stringify(parsed.issues)}`);
    }

    const defaults = parsed.value.filter((entry) => entry.default?.value === true);

    if (defaults.length !== 1) {
      throw new TypeError('src/data/languages.json: exactly one language is the default');
    }

    this.all = parsed.value.map((entry) => ({
      code: entry.code,
      label: entry.label.toString(),
      isDefault: entry.default?.value === true,
    }));
  }

  /** The language the site falls back to, served at the root. */
  public get root(): LanguageCode {
    const root = this.all.find((language) => language.isDefault);

    if (root === undefined) {
      throw new TypeError('no default language');
    }

    return root.code;
  }

  /** The site language `code` names, such as a route's or `Astro.currentLocale`, else the root. */
  public of(code?: string): LanguageCode {
    const parsed = LanguageCode.parse(code ?? this.root.toString());

    return parsed.ok && this.all.some((language) => language.code.equals(parsed.value))
      ? parsed.value
      : this.root;
  }

  /** Every language other than the root, each served under its own folder. */
  public get others(): readonly LanguageCode[] {
    return this.all.filter((language) => !language.isDefault).map((language) => language.code);
  }
}
