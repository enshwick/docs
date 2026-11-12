import { AnyString, n } from '@horizon-republic/nominal-types';

import { CompatibilityData } from './compatibility.ts';

/** One mod, as its card on the front page and the head of its own page show it. */
export interface ModCardFacts {
  slug: string;
  name: string;
  line: string;
  /** Who needs the mod: `server`, `everyone` or `client`. */
  needs: string;
  repository: string;
  /** The release the site reads the mod at; a mod without a release is read from `main`. */
  tag?: string;
  version?: string;
  /** The Enshwick API the mod needs, where its release names one. */
  api?: string;
  /** Whether the mod has a page on the site to link to. */
  page: boolean;
}

/** Who needs a mod: the server alone, the server and every player, or one player's game. */
const Side = AnyString.subtype('docs.ModSide', n.oneOf('server', 'everyone', 'client'));

/**
 * `src/data/mods.json`: the mods the front page presents, each with who needs it and one line per
 * language; a mod left out keeps its own page.
 */
const ModLines = n.record(
  AnyString,
  n.object({ side: Side, summary: n.record(AnyString, AnyString) }),
);

/** The parsed compatibility data. */
type Compat = Extract<ReturnType<typeof CompatibilityData.parse>, { ok: true }>['value'];

/** Who needs each mod and its lines by language, keyed by the mod's slug. */
type Lines = Map<string, { side: string; summary: Map<string, string> }>;

/** The front page's data: the newest release and a card per mod it presents. */
export class FrontData {
  /** The language every mod line must have. */
  private static readonly root = 'en';

  /**
   * The questions the front page answers, in its order; each has `front.faq.<id>.q` and `.a` in
   * the site's texts, and the page's structured data states the same ones.
   */
  public static readonly questions = [
    'loader',
    'languages',
    'speed',
    'safe',
    'server',
    'linux',
    'saves',
    'update',
  ];

  /** The Enshwick API of the newest platform release, where there is one. */
  public readonly version?: string;
  public readonly mods: ModCardFacts[];

  private constructor(version: string | undefined, mods: ModCardFacts[]) {
    if (version !== undefined) {
      this.version = version;
    }

    this.mods = mods;
  }

  /** Builds the front page's data from the compatibility data and the mods' lines, in `language`. */
  public static from(compat: unknown, lines: unknown, language: string): FrontData {
    const parsedCompat = CompatibilityData.parse(compat);

    if (!parsedCompat.ok) {
      throw new TypeError(`compatibility.json: ${JSON.stringify(parsedCompat.issues)}`);
    }

    const parsedLines = ModLines.parse(lines);

    if (!parsedLines.ok) {
      throw new TypeError(`src/data/mods.json: ${JSON.stringify(parsedLines.issues)}`);
    }

    const byMod: Lines = new Map(
      Object.entries(parsedLines.value).map(([slug, entry]) => [
        slug,
        {
          side: entry.side.toString(),
          summary: new Map(
            Object.entries(entry.summary).map(([code, text]) => [code, text.toString()]),
          ),
        },
      ]),
    );
    const known = new Set(parsedCompat.value.mods.map((mod) => mod.slug.toString()));
    const unknown = [...byMod.keys()].filter((slug) => !known.has(slug));

    if (unknown.length > 0) {
      throw new TypeError(`src/data/mods.json: no mod page for ${unknown.join(', ')}`);
    }

    const newest = parsedCompat.value.platform[0];
    const mods = parsedCompat.value.mods
      .filter((mod) => byMod.has(mod.slug.toString()))
      .map((mod) => FrontData.modCard(mod, byMod, language));

    return new FrontData(newest?.api?.toString(), mods);
  }

  /** One mod's card, its line in `language` or English, its side checked against its page. */
  private static modCard(
    mod: Compat['mods'][number],
    lines: Lines,
    language: string,
  ): ModCardFacts {
    const slug = mod.slug.toString();
    const entry = lines.get(slug);
    const line = entry?.summary.get(language) ?? entry?.summary.get(FrontData.root);

    if (entry === undefined || line === undefined) {
      throw new TypeError(`src/data/mods.json: no line for ${slug}`);
    }

    if (mod.needs !== undefined && mod.needs.toString() !== entry.side) {
      throw new TypeError(
        `src/data/mods.json: ${slug} is for "${entry.side}", its page says "${mod.needs.toString()}"`,
      );
    }

    const card: ModCardFacts = {
      slug,
      name: mod.name.toString(),
      line,
      needs: entry.side,
      repository: mod.repository.toString(),
      page: mod.page.value,
    };

    if (mod.tag !== undefined) {
      card.tag = mod.tag.toString();
    }

    if (mod.version !== undefined) {
      card.version = mod.version.toString();
    }

    if (mod.api !== undefined) {
      card.api = mod.api.toString();
    }

    return card;
  }
}
