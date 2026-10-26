import { PlayerPageFrontMatter } from '../../src/site/player-page.ts';

/** The parsed front matter of a player page. */
export type PlayerPageData = NonNullable<
  Extract<ReturnType<typeof PlayerPageFrontMatter.parse>, { ok: true }>['value']
>;

/** A mod's `docs/player.md`, or one of its translations, split into checked front matter and body. */
export class PlayerPageSource {
  private static readonly frontMatter = /^---\n([\s\S]*?)\n---\n?/u;

  private constructor(
    public readonly data: PlayerPageData,
    public readonly body: string,
  ) {}

  /**
   * Reads a page and checks its front matter against the schema every mod shares.
   *
   * @throws {TypeError} naming `origin` and every problem, so a mod's broken page fails the build.
   */
  public static parse(origin: string, text: string): PlayerPageSource {
    const match = PlayerPageSource.frontMatter.exec(text);

    if (match?.[1] === undefined) {
      throw new TypeError(`${origin}: a player page opens with front matter between --- lines`);
    }

    const raw: unknown = Bun.YAML.parse(match[1]);
    const parsed = PlayerPageFrontMatter.parse(PlayerPageSource.settingsAsText(raw));

    if (!parsed.ok) {
      throw new TypeError(`${origin}: ${JSON.stringify(parsed.issues)}`);
    }

    return new PlayerPageSource(parsed.value, text.slice(match[0].length).trimStart());
  }

  /** YAML reads `default: 2` as a number; a settings table shows every value as written. */
  private static settingsAsText(raw: unknown): unknown {
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !('settings' in raw) ||
      !Array.isArray(raw.settings)
    ) {
      return raw;
    }

    const settings: unknown[] = raw.settings;

    return {
      ...raw,
      settings: settings.map((setting) =>
        typeof setting === 'object' && setting !== null
          ? Object.fromEntries(
              Object.entries(setting).map(([key, value]) => [
                key,
                typeof value === 'number' || typeof value === 'boolean' ? String(value) : value,
              ]),
            )
          : setting,
      ),
    };
  }
}
