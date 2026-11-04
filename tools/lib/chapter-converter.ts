import { dirname, join, normalize } from 'node:path/posix';

import { ModLanguages } from '../../src/site/mod-languages.ts';

/** The front matter and body of one chapter as a site page. */
export interface ChapterPage {
  readonly title: string;
  readonly description: string | undefined;
  readonly body: string;
  /** Whether the body uses components, so the page is MDX. */
  readonly mdx: boolean;
}

/** One top-level fenced code block: its first and last line and its language. */
interface FencedBlock {
  readonly start: number;
  readonly end: number;
  readonly language: string;
}

/** Turns one mdBook chapter into a site page: its title out of the body, mdBook's code syntax and links made plain. */
export class ChapterConverter {
  private static readonly fence = /^(\s*)(`{3,}|~{3,})(.*)$/u;
  private static readonly mdLink = /\]\(([^)\s]+?\.md)(#[^)\s]*)?\)/gu;
  private static readonly title = /^# (.+)$/mu;
  private static readonly rust = 'rust';
  private static readonly languageBlock = /^<div data-lang="([^"]*)">\s*$/u;
  private static readonly htmlComment = /^\s*<!--.*-->\s*$/u;
  private static readonly tabsImport =
    "import { TabItem, Tabs } from '@astrojs/starlight/components';";

  /**
   * @param url the site URL of a chapter by its book path, such as `/dev/content/items/`.
   * @param languages the mod languages a page switches between.
   */
  public constructor(
    private readonly url: (path: string) => string,
    private readonly languages: ModLanguages = ModLanguages.site,
  ) {}

  /** The page for the chapter at `path` with the text `markdown`. */
  public convert(path: string, markdown: string): ChapterPage {
    const titleMatch = ChapterConverter.title.exec(markdown);

    if (titleMatch === null || titleMatch[1] === undefined) {
      throw new Error(`${path}: a chapter opens with a level-one heading`);
    }

    const withoutTitle = markdown.replace(ChapterConverter.title, '').replace(/^\s+/u, '');
    const { body, mdx } = this.switched(ChapterConverter.code(withoutTitle));
    const linked = this.links(path, body);

    return {
      title: titleMatch[1].trim(),
      description: ChapterConverter.description(linked),
      body: mdx ? `${ChapterConverter.tabsImport}\n\n${linked}` : linked,
      mdx,
    };
  }

  /**
   * The chapter with its languages switchable. Adjacent code blocks for one thing in different mod
   * languages become tabs that follow the reader's one choice; a `<div data-lang="luau">` block
   * becomes a block shown only while that language is chosen. A body with tabs is MDX, which takes
   * no HTML comment, so they go.
   */
  public switched(markdown: string): { body: string; mdx: boolean } {
    const lines = markdown.split('\n');
    const blocks = ChapterConverter.blocks(lines);
    const starts = new Map(blocks.map((block) => [block.start, block]));
    const out: string[] = [];
    const comments = new Set<number>();
    let mdx = false;
    let line = 0;

    while (line < lines.length) {
      const block = starts.get(line);

      if (block !== undefined) {
        const group = this.group(lines, blocks, block);
        const last = group.at(-1)?.block ?? block;

        out.push(
          ...(group.length > 0
            ? ChapterConverter.tabs(lines, group)
            : lines.slice(block.start, block.end + 1)),
        );
        mdx ||= group.length > 0;
        line = last.end + 1;

        continue;
      }

      const text = lines[line] ?? '';

      if (ChapterConverter.htmlComment.test(text)) {
        comments.add(out.length);
      }

      out.push(this.marked(text));
      line += 1;
    }

    // shortcut: a comment inside an indented code block counts as prose; split blocks() by indent if one appears.
    const body = mdx ? out.filter((_text, index) => !comments.has(index)) : out;

    return { body: body.join('\n'), mdx };
  }

  /** A group of blocks as one tab group, each block a tab named for its language. */
  private static tabs(
    lines: readonly string[],
    group: ReadonlyArray<{ block: FencedBlock; label: string }>,
  ): string[] {
    return [
      `<Tabs syncKey="${ModLanguages.syncKey}">`,
      ...group.flatMap(({ block, label }) => [
        `<TabItem label="${label}">`,
        '',
        ...lines.slice(block.start, block.end + 1),
        '',
        '</TabItem>',
      ]),
      '</Tabs>',
    ];
  }

  /** The line, or for a `<div data-lang="…">` of a mod language the block shown only for it. */
  private marked(text: string): string {
    const marked = ChapterConverter.languageBlock.exec(text.trim());
    const label = marked === null ? undefined : this.languages.labelOf(marked[1] ?? '');

    return label === undefined ? text : `<div ${ModLanguages.onlyAttribute}="${label}">`;
  }

  /**
   * The run of blocks from `first` on, each after the last with only blank lines between, when it
   * holds two or more blocks in different mod languages; otherwise empty.
   */
  private group(
    lines: readonly string[],
    blocks: readonly FencedBlock[],
    first: FencedBlock,
  ): Array<{ block: FencedBlock; label: string }> {
    const run = [first];

    for (const next of blocks.slice(blocks.indexOf(first) + 1)) {
      const previous = run.at(-1) ?? first;
      const between = lines.slice(previous.end + 1, next.start);

      if (!between.every((text) => text.trim() === '')) {
        break;
      }

      run.push(next);
    }

    const labelled = run.map((block) => ({ block, label: this.languages.labelOf(block.language) }));
    const labels = new Set(labelled.map(({ label }) => label));

    if (
      run.length < 2 ||
      labels.size !== run.length ||
      labelled.some(({ label }) => label === undefined)
    ) {
      return [];
    }

    return labelled.map(({ block, label }) => ({ block, label: label ?? '' }));
  }

  /** The fenced code blocks that start at the line's left edge, outside a list or quote. */
  private static blocks(lines: readonly string[]): FencedBlock[] {
    const found: FencedBlock[] = [];
    let open: { start: number; marker: string; language: string; indent: string } | undefined;

    lines.forEach((text, index) => {
      const fence = ChapterConverter.fence.exec(text);

      if (fence === null) {
        return;
      }

      if (open === undefined) {
        open = {
          start: index,
          marker: fence[2] ?? '```',
          language: (fence[3] ?? '').trim(),
          indent: fence[1] ?? '',
        };

        return;
      }

      if ((fence[2] ?? '').startsWith(open.marker) && (fence[3] ?? '').trim() === '') {
        if (open.indent === '') {
          found.push({ start: open.start, end: index, language: open.language });
        }

        open = undefined;
      }
    });

    return found;
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
