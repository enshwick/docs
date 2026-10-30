import { languages } from './languages.ts';
import { Sources } from './types.ts';

/**
 * The developer area's versions from `src/data/sources.json`: the newest always at `/dev/`, each
 * older minor under `/dev/<minor>/`. An older minor's pages carry `noindex`, an "older version"
 * banner and no sitemap entry, so a new minor never moves a page that search already knows.
 */
export class DeveloperVersions {
  private static readonly folder = 'dev';

  private readonly older: readonly string[];

  public constructor(data: unknown) {
    const parsed = Sources.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/sources.json: ${JSON.stringify(parsed.issues)}`);
    }

    this.older = parsed.value.platform.versions.slice(1).map((version) => version.name.toString());
  }

  /** The older minor whose page `path` is, such as `1.0` for `/uk/dev/1.0/hooks/`; none for the newest. */
  public olderAt(path: string): string | undefined {
    const parts = path.split('/').filter((part) => part !== '');
    const [first] = parts;
    const rest = languages.others.some((code) => code.toString() === first)
      ? parts.slice(1)
      : parts;
    const [folder, version] = rest;

    return folder === DeveloperVersions.folder &&
      version !== undefined &&
      this.older.includes(version)
      ? version
      : undefined;
  }
}
