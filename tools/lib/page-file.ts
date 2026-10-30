import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * A generated Markdown page: front matter and body, written under the content root, dated by the
 * last commit of its source. A page without such a date shows none, never the date of the build.
 */
export class PageFile {
  public static readonly contentRoot = 'src/content/docs';

  public constructor(
    public readonly slug: string,
    private readonly frontMatter: Readonly<Record<string, unknown>>,
    private readonly body: string,
    private readonly lastUpdated: Date | undefined,
  ) {}

  /** The file's path, `<content root>/<slug>.md`. */
  public get path(): string {
    return `${PageFile.contentRoot}/${this.slug}.md`;
  }

  /** The file's text. */
  public toString(): string {
    const defined = Object.fromEntries(
      Object.entries({
        ...this.frontMatter,
        lastUpdated: this.lastUpdated?.toISOString() ?? false,
      }).filter(([, value]) => value !== undefined),
    );

    return `---\n${Bun.YAML.stringify(defined, null, 2).trimEnd()}\n---\n\n${this.body.trimEnd()}\n`;
  }

  /** Writes the file, creating its folders. */
  public async write(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await Bun.write(this.path, this.toString());
  }
}
