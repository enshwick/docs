import { PlayerPageFrontMatter } from '../../src/site/player-page.ts';

/** The parsed front matter of a player page. */
export type PlayerPageData = NonNullable<
  Extract<ReturnType<typeof PlayerPageFrontMatter.parse>, { ok: true }>['value']
>;

/** A mod's `docs/player.md`, or one of its translations, split into checked front matter and body. */
export class PlayerPageSource {
  private static readonly frontMatter = /^---\n([\s\S]*?)\n---\n?/u;
  private static readonly listItem = /^[-*] /u;
  private static readonly continuation = /^\s+\S/u;
  private static readonly platform = /\benshwick\b/iu;
  /** Items of the opening list; more is no longer a short list. */
  private static readonly maxChanges = 5;

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

    const body = text.slice(match[0].length).trimStart();
    const problem = PlayerPageSource.bodyProblem(body);

    if (problem !== undefined) {
      throw new TypeError(`${origin}: ${problem}`);
    }

    return new PlayerPageSource(parsed.value, body);
  }

  /** What the text under the front matter lacks: the opening list of changes, or the line that it needs Enshwick. */
  private static bodyProblem(body: string): string | undefined {
    const lines = body.split('\n');
    const end = lines.findIndex(
      (line) =>
        line.trim() !== '' &&
        !PlayerPageSource.listItem.test(line) &&
        !PlayerPageSource.continuation.test(line),
    );
    const items = lines
      .slice(0, end === -1 ? lines.length : end)
      .filter((line) => PlayerPageSource.listItem.test(line)).length;

    if (!PlayerPageSource.listItem.test(lines[0] ?? '')) {
      return 'a player page opens with a list of what the mod changes';
    }

    if (items > PlayerPageSource.maxChanges) {
      return `the opening list has ${items} items; a short list has at most ${PlayerPageSource.maxChanges}`;
    }

    if (!PlayerPageSource.platform.test(body)) {
      return 'a player page says the mod needs Enshwick';
    }

    return undefined;
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
