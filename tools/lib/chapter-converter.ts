import { dirname, join, normalize } from 'node:path/posix';

/** The front matter and body of one chapter as a site page. */
export interface ChapterPage {
  readonly title: string;
  readonly description: string | undefined;
  readonly body: string;
}

/** Turns one mdBook chapter into a site page: its title out of the body, mdBook's code syntax and links made plain. */
export class ChapterConverter {
  private static readonly fence = /^(\s*)(`{3,}|~{3,})(.*)$/u;
  private static readonly mdLink = /\]\(([^)\s]+?\.md)(#[^)\s]*)?\)/gu;
  private static readonly title = /^# (.+)$/mu;
  private static readonly rust = 'rust';

  /** @param url the site URL of a chapter by its book path, such as `/dev/content/items/`. */
  public constructor(private readonly url: (path: string) => string) {}

  /** The page for the chapter at `path` with the text `markdown`. */
  public convert(path: string, markdown: string): ChapterPage {
    const titleMatch = ChapterConverter.title.exec(markdown);

    if (titleMatch === null || titleMatch[1] === undefined) {
      throw new Error(`${path}: a chapter opens with a level-one heading`);
    }

    const withoutTitle = markdown.replace(ChapterConverter.title, '').replace(/^\s+/u, '');
    const body = this.links(path, ChapterConverter.code(withoutTitle));

    return { title: titleMatch[1].trim(), description: ChapterConverter.description(body), body };
  }

  /** mdBook's fence attributes dropped (`rust,ignore` is `rust`), and its hidden lines in Rust examples removed. */
  public static code(markdown: string): string {
    const out: string[] = [];
    let open: { marker: string; rust: boolean } | undefined;

    for (const line of markdown.split('\n')) {
      const fence = ChapterConverter.fence.exec(line);

      if (fence !== null && open === undefined) {
        const info = (fence[3] ?? '').trim();
        const language = info.split(/[,\s]/u)[0] ?? '';
        open = { marker: fence[2] ?? '```', rust: language === ChapterConverter.rust };
        out.push(`${fence[1] ?? ''}${fence[2] ?? ''}${language}`);
        continue;
      }

      if (
        fence !== null &&
        open !== undefined &&
        (fence[2] ?? '').startsWith(open.marker) &&
        (fence[3] ?? '').trim() === ''
      ) {
        open = undefined;
        out.push(line);
        continue;
      }

      if (open?.rust === true) {
        const trimmed = line.trimStart();

        if (trimmed === '#' || trimmed.startsWith('# ')) {
          continue;
        }

        if (trimmed.startsWith('##')) {
          out.push(line.replace('##', '#'));
          continue;
        }
      }

      out.push(line);
    }

    return out.join('\n');
  }

  /** The first sentence of the first paragraph, without Markdown, for the page's meta description. */
  public static description(body: string): string | undefined {
    const paragraph = body
      .split(/\n\s*\n/u)
      .map((block) => block.trim())
      .find((block) => block !== '' && !/^[#`|>\-*<]/u.test(block));

    if (paragraph === undefined) {
      return undefined;
    }

    const plain = paragraph
      .replaceAll(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
      .replaceAll(/[`*]/gu, '')
      .replaceAll(/\s+/gu, ' ');
    const sentence = /^.+?[.!?](\s|$)/u.exec(plain)?.[0] ?? plain;

    return sentence.trim();
  }

  private links(path: string, markdown: string): string {
    return markdown.replace(
      ChapterConverter.mdLink,
      (match, target: string, anchor: string | undefined) => {
        if (/^[a-z]+:/u.test(target)) {
          return match;
        }

        const resolved = normalize(join(dirname(path), target));

        return `](${this.url(resolved)}${anchor ?? ''})`;
      },
    );
  }
}
