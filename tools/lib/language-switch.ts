import { ModLanguageKeys } from '../../src/site/mod-language-keys.ts';
import { ModLanguages } from '../../src/site/mod-languages.ts';

/** One fenced code block: its first and last line and its language. */
interface FencedBlock {
  readonly start: number;
  readonly end: number;
  readonly language: string;
  /** Whether it starts indented, inside a list or quote, where a tab group cannot go. */
  readonly indent: boolean;
}

/** A tab of a group: a block and the label of its language. */
interface Tab {
  readonly block: FencedBlock;
  readonly label: string;
}

/**
 * Makes a chapter's mod languages switchable. Adjacent code blocks for one thing in different mod
 * languages become tabs that follow the reader's one choice; on a page with tabs, a
 * `<div data-lang="luau">` block shows only while its language is chosen. A page without tabs
 * offers no choice, so its marked blocks stay visible.
 */
export class LanguageSwitch {
  private static readonly fence = /^(\s*)(`{3,}|~{3,})(.*)$/u;
  private static readonly languageBlock = /^<div data-lang="([^"]*)">\s*$/u;

  public constructor(private readonly languages: ModLanguages = ModLanguages.site) {}

  /** The Markdown with its languages switchable, and whether it now has tabs, which need MDX. */
  public apply(markdown: string): { body: string; mdx: boolean } {
    const lines = markdown.split('\n');
    const blocks = LanguageSwitch.blocks(lines);
    const groups = blocks
      .map((_block, index) => this.group(lines, blocks, index))
      .filter((group) => group.length > 0);

    if (groups.length === 0) {
      return { body: markdown, mdx: false };
    }

    const out: string[] = [];
    let line = 0;

    for (const group of groups) {
      const first = Math.min(...group.map((tab) => tab.block.start));
      const last = Math.max(...group.map((tab) => tab.block.end));

      if (first < line) {
        continue;
      }

      out.push(
        ...this.marked(lines.slice(line, first), blocks, line),
        ...LanguageSwitch.tabs(lines, group),
      );
      line = last + 1;
    }

    out.push(...this.marked(lines.slice(line), blocks, line));

    return { body: out.join('\n'), mdx: true };
  }

  /** A group as one tab group, each block a tab named for its language. */
  private static tabs(lines: readonly string[], group: readonly Tab[]): string[] {
    return [
      `<Tabs syncKey="${ModLanguageKeys.syncKey}">`,
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

  /** The lines, each `<div data-lang="…">` of a mod language outside code a block for it. */
  private marked(
    lines: readonly string[],
    blocks: readonly FencedBlock[],
    offset: number,
  ): string[] {
    return lines.map((text, index) => {
      const at = offset + index;
      const inCode = blocks.some((block) => block.start <= at && at <= block.end);
      const marked = inCode ? null : LanguageSwitch.languageBlock.exec(text.trim());
      const label = marked === null ? undefined : this.languages.labelOf(marked[1] ?? '');

      return label === undefined ? text : `<div ${ModLanguageKeys.onlyAttribute}="${label}">`;
    });
  }

  /**
   * The run of blocks from `blocks[index]` on, each after the previous with only blank lines
   * between, while each is a mod language not yet in the run; two or more make a group, in the
   * order of the language list so the first tab is the language a new reader sees.
   */
  private group(lines: readonly string[], blocks: readonly FencedBlock[], index: number): Tab[] {
    const run: Tab[] = [];

    for (const block of blocks.slice(index)) {
      const label = this.languages.labelOf(block.language);
      const previous = run.at(-1)?.block;
      const between = previous === undefined ? [] : lines.slice(previous.end + 1, block.start);

      if (
        label === undefined ||
        block.indent ||
        run.some((tab) => tab.label === label) ||
        !between.every((text) => text.trim() === '')
      ) {
        break;
      }

      run.push({ block, label });
    }

    return run.length < 2
      ? []
      : run.toSorted((a, b) => this.languages.rank(a.label) - this.languages.rank(b.label));
  }

  /** Every fenced code block, whether it starts at the left edge or inside a list or quote. */
  private static blocks(lines: readonly string[]): FencedBlock[] {
    const found: FencedBlock[] = [];
    let open: { start: number; marker: string; language: string; indent: boolean } | undefined;

    lines.forEach((text, index) => {
      const fence = LanguageSwitch.fence.exec(text);

      if (fence === null) {
        return;
      }

      if (open === undefined) {
        open = {
          start: index,
          marker: fence[2] ?? '```',
          language: (fence[3] ?? '').trim(),
          indent: (fence[1] ?? '') !== '',
        };

        return;
      }

      if ((fence[2] ?? '').startsWith(open.marker) && (fence[3] ?? '').trim() === '') {
        found.push({ ...open, end: index });
        open = undefined;
      }
    });

    return found;
  }
}
