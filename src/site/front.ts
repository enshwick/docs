import { AnyString, n } from '@horizon-republic/nominal-types';

import { CompatibilityData } from './compatibility.ts';

/** The front page's data: the newest release, the game builds it runs on and a card per mod. */
export interface FrontData {
  version?: string;
  gameBuilds: { side: string; name: string }[];
  mods: ModCard[];
}

/** One mod on the front page. */
export interface ModCard {
  slug: string;
  name: string;
  line: string;
  needs: string;
  /** Whether the mod has a page on the site to link to. */
  page: boolean;
}

/** `src/data/mods.json`: one line per mod and language. */
const ModLines = n.record(AnyString, n.record(AnyString, AnyString));

/** The language every mod line must have. */
const ROOT = 'en';

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

  const byMod = new Map(
    Object.entries(parsedLines.value).map(([slug, byLanguage]) => [
      slug,
      new Map(Object.entries(byLanguage).map(([code, text]) => [code, text.toString()])),
    ]),
  );

  const newest = parsedCompat.value.platform[0];
  const gameBuilds: FrontData['gameBuilds'] = [];
  for (const side of ['client', 'server']) {
    const ofSide = (newest?.builds ?? []).filter((build) => build.side.toString() === side);
    const steam = ofSide.filter((build) => build.steamBuild !== undefined);
    const pick = (steam.length > 0 ? steam : ofSide).at(-1);
    if (pick !== undefined) {
      gameBuilds.push({ side, name: pick.name.toString() });
    }
  }

  const mods = parsedCompat.value.mods.map((mod) => {
    const slug = mod.slug.toString();
    const texts = byMod.get(slug);
    const line = texts?.get(language) ?? texts?.get(ROOT);
    if (line === undefined) {
      throw new TypeError(`src/data/mods.json: no line for ${slug}`);
    }
    return {
      slug,
      name: mod.name.toString(),
      line,
      needs: mod.needs?.toString() ?? 'everyone',
      page: mod.page.value,
    };
  });

  const version = newest?.api?.toString();
  return version === undefined ? { gameBuilds, mods } : { version, gameBuilds, mods };
}
