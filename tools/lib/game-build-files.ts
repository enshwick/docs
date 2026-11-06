import type { GameBuild } from './developer-area.ts';
import { Fields } from './fields.ts';

/**
 * Reads one game build from the files a platform version keeps for it: its compatibility report,
 * which every build the platform runs without a table of its own has, and the build table older
 * versions kept, which may have no report.
 */
export class GameBuildFiles {
  /** The build of `file` from its table and report texts, the report's fields first. */
  public static read(
    file: string,
    { table, report }: { readonly table?: string; readonly report?: string },
  ): GameBuild {
    const heads = [report, table].flatMap((text) =>
      text === undefined ? [] : [GameBuildFiles.header(text)],
    );
    const field = (key: string): unknown =>
      heads.map((head) => head.at(key).value).find((value) => value !== undefined);
    const text = (key: string): string | undefined => new Fields(field(key)).text();

    const number = (key: string): string | undefined => {
      const value = field(key);

      return typeof value === 'number' ? String(value) : undefined;
    };

    return {
      side: text('side') ?? file,
      name: text('name') ?? text('table') ?? file,
      steamBuild: number('steam_build'),
      gameVersion: number('game_version'),
      off: report === undefined ? undefined : GameBuildFiles.off(report),
    };
  }

  /** Only the header: the tables hold 64-bit addresses, which no JavaScript number holds. */
  private static header(this: void, text: string): Fields {
    const at = text.search(/^\[/mu);

    return new Fields(Bun.TOML.parse(at < 0 ? text : text.slice(0, at)));
  }

  /** The loader features a report names as off or partly off. */
  private static off(this: void, report: string): readonly string[] {
    const features = new Fields(Bun.TOML.parse(report)).at('feature').value;

    return (Array.isArray(features) ? features : []).flatMap((feature) => {
      const name = new Fields(feature).at('name').text();

      return name === undefined ? [] : [name];
    });
  }
}
