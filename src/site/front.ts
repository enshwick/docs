import { AnyString, n } from '@horizon-republic/nominal-types';

import { CompatibilityData } from './compatibility.ts';

/** The front page's data: the newest release, the game builds it runs on and a card per mod. */
export interface FrontData {
  version?: string;
  gameBuilds: { side: string; name: string }[];
  mods: ModCard[];
}

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

/** The language every mod line must have. */
const ROOT = 'en';

/** The parsed compatibility data. */
type Compat = Extract<ReturnType<typeof CompatibilityData.parse>, { ok: true }>['value'];

/** Who needs each mod and its lines by language, keyed by the mod's slug. */
type Lines = Map<string, { side: string; summary: Map<string, string> }>;

/** The newest platform release's game builds: per side, the newest with a Steam build. */
const newestBuilds = (newest: Compat['platform'][number] | undefined): FrontData['gameBuilds'] =>
  ['client', 'server'].flatMap((side) => {
    const ofSide = (newest?.builds ?? []).filter((build) => build.side.toString() === side);
    const steam = ofSide.filter((build) => build.steamBuild !== undefined);
    const pick = (steam.length > 0 ? steam : ofSide).at(-1);

    return pick === undefined ? [] : [{ side, name: pick.name.toString() }];
  });

/** One mod's card, its line in `language` or English, its side checked against its page. */
const modCard = (mod: Compat['mods'][number], lines: Lines, language: string): ModCard => {
  const slug = mod.slug.toString();
  const entry = lines.get(slug);
  const line = entry?.summary.get(language) ?? entry?.summary.get(ROOT);

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
};

/** Builds the front page's data from the compatibility data and the mods' lines, in `language`. */
export function frontData(compat: unknown, lines: unknown, language: string): FrontData {
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
  const gameBuilds = newestBuilds(newest);
  const mods = parsedCompat.value.mods.map((mod) => modCard(mod, byMod, language));
  const version = newest?.api?.toString();

  return version === undefined ? { gameBuilds, mods } : { version, gameBuilds, mods };
}
