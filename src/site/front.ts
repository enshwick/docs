import { AnyString, n } from '@horizon-republic/nominal-types';

import { CompatibilityData } from './compatibility.ts';

/** One mod, as its card on the front page and the head of its own page show it. */
export interface ModCard {
  slug: string;
  name: string;
  line: string;
  /** Who needs the mod: `server`, `everyone` or `client`. */
  needs: string;
  repository: string;
  /** The release the site reads the mod at. */
  tag: string;
  version?: string;
  /** The Enshwick API the mod needs, where its release names one. */
  api?: string;
  /** Whether the mod has a page on the site to link to. */
  page: boolean;
}

/** Who needs a mod: the server alone, the server and every player, or one player's game. */
const Side = AnyString.subtype('docs.ModSide', n.oneOf('server', 'everyone', 'client'));

/** `src/data/mods.json`: per mod, who needs it and one line per language. */
const ModLines = n.record(
  AnyString,
  n.object({ side: Side, summary: n.record(AnyString, AnyString) }),
);

/** The parsed compatibility data. */
type Compat = Extract<ReturnType<typeof CompatibilityData.parse>, { ok: true }>['value'];

/** Who needs each mod and its lines by language, keyed by the mod's slug. */
type Lines = Map<string, { side: string; summary: Map<string, string> }>;

/** One of the newest platform release's game builds: its side and its name. */
interface GameBuild {
  side: string;
  name: string;
}

/** The front page's data: the newest release, the game builds it runs on and a card per mod. */
export class FrontData {
  /** The language every mod line must have. */
  private static readonly root = 'en';

  /** The sides the front page names a game build for, in the order it shows them. */
  private static readonly sides = ['client', 'server'];

  public readonly version: string | undefined;
  public readonly gameBuilds: GameBuild[];
  public readonly mods: ModCard[];

  private constructor(version: string | undefined, gameBuilds: GameBuild[], mods: ModCard[]) {
    this.version = version;
    this.gameBuilds = gameBuilds;
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
    const newest = parsedCompat.value.platform[0];
    const mods = parsedCompat.value.mods.map((mod) => FrontData.modCard(mod, byMod, language));

    return new FrontData(newest?.api?.toString(), FrontData.newestBuilds(newest), mods);
  }

  /** The newest platform release's game builds: per side, the newest with a Steam build. */
  private static newestBuilds(newest: Compat['platform'][number] | undefined): GameBuild[] {
    return FrontData.sides.flatMap((side) => {
      const ofSide = (newest?.builds ?? []).filter((build) => build.side.toString() === side);
      const steam = ofSide.filter((build) => build.steamBuild !== undefined);
      const pick = (steam.length > 0 ? steam : ofSide).at(-1);

      return pick === undefined ? [] : [{ side, name: pick.name.toString() }];
    });
  }

  /** One mod's card, its line in `language` or English, its side checked against its page. */
  private static modCard(mod: Compat['mods'][number], lines: Lines, language: string): ModCard {
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

    const card: ModCard = {
      slug,
      name: mod.name.toString(),
      line,
      needs: entry.side,
      repository: mod.repository.toString(),
      tag: mod.tag.toString(),
      page: mod.page.value,
    };

    if (mod.version !== undefined) {
      card.version = mod.version.toString();
    }

    if (mod.api !== undefined) {
      card.api = mod.api.toString();
    }

    return card;
  }
}
