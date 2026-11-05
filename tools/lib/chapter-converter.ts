import { dirname, join, normalize } from 'node:path/posix';

import { LanguageSwitch } from './language-switch.ts';
import type { PageType } from './summary.ts';

/** The front matter and body of one chapter as a site page. */
export interface ChapterPage {
  readonly title: string;
  /** The type the chapter's opening comment declares; absent for a file without one, such as the changelog. */
  readonly type: PageType | undefined;
  readonly description: string | undefined;
  readonly body: string;
  /** Whether the body uses components, so the page is written as MDX. */
  readonly mdx: boolean;
}

/** Turns one mdBook chapter into a site page: its title out of the body, mdBook's code syntax and links made plain. */
export class ChapterConverter {
  private static readonly fence = /^(\s*)(`{3,}|~{3,})(.*)$/u;
  private static readonly mdLink = /\]\(([^)\s]+?\.md)(#[^)\s]*)?\)/gu;
  private static readonly title = /^# (.+)$/mu;
  private static readonly rust = 'rust';
  /** The comment a chapter opens with, which mdBook hides: `key: value` lines, as enshwick's `cargo xtask check` requires. */
  private static readonly header = /^<!--\n(.*?)\n-->\n/su;
  private static readonly headerField = /^(\w+): (.+)$/u;
  private static readonly typeKey = 'type';
  private static readonly descriptionKey = 'description';
  private static readonly pageTypes: readonly PageType[] = [
    'tutorial',
    'how-to',
    'reference',
    'explanation',
  ];

  /**
   * @param url the site URL of a chapter by its book path, such as `/dev/content/items/`.
   * @param languages what makes the chapter's mod languages switchable.
   */
  public constructor(
    private readonly url: (path: string) => string,
    private readonly languages: LanguageSwitch = new LanguageSwitch(),
  ) {}

  /** The page for the chapter at `path` with the text `markdown`. */
  public convert(path: string, markdown: string): ChapterPage {
    const header = ChapterConverter.header.exec(markdown);
    const fields = ChapterConverter.fields(path, header?.[1]);
    const text = header === null ? markdown : markdown.slice(header[0].length);
    const titleMatch = ChapterConverter.title.exec(text);

    if (titleMatch === null || titleMatch[1] === undefined) {
      throw new Error(`${path}: a chapter opens with a level-one heading`);
    }

    const withoutTitle = text.replace(ChapterConverter.title, '').replace(/^\s+/u, '');
    const { body, mdx } = this.languages.apply(ChapterConverter.code(withoutTitle));
    const linked = this.links(path, body);

    return {
      title: titleMatch[1].trim(),
      type: ChapterConverter.pageType(path, fields.get(ChapterConverter.typeKey)),
      description:
        fields.get(ChapterConverter.descriptionKey) ?? ChapterConverter.description(linked),
      body: linked,
      mdx,
    };
  }

  /**
   * The `key: value` lines of a chapter's opening comment.
   *
   * @throws {Error} for a line of another shape, naming the chapter.
   */
  private static fields(path: string, block: string | undefined): Map<string, string> {
    const fields = new Map<string, string>();

    for (const line of block?.split('\n') ?? []) {
      const [, key, value] = ChapterConverter.headerField.exec(line) ?? [];

      if (key === undefined || value === undefined) {
        throw new Error(`${path}: the opening comment has a line that is no "key: value": ${line}`);
      }

      fields.set(key, value.trim());
    }

    return fields;
  }

  /**
   * The declared page type, checked.
   *
   * @throws {Error} for a type outside Diátaxis's four, naming the chapter.
   */
  private static pageType(path: string, value: string | undefined): PageType | undefined {
    if (value === undefined) {
      return undefined;
    }

    const type = ChapterConverter.pageTypes.find((known) => known === value);

    if (type === undefined) {
      throw new Error(`${path}: type ${value} is none of ${ChapterConverter.pageTypes.join(', ')}`);
    }

    return type;
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
