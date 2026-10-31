/** One finding in a page's player text, with the 1-based line it starts on. */
export interface ProseFinding {
  readonly line: number;
  readonly message: string;
}

/** One paragraph or list item of prose, as plain text, with the line it starts on. */
interface ProseBlock {
  readonly line: number;
  text: string;
}

/**
 * The countable part of the player writing rules over one page's Markdown: words players are not
 * told, sentence and paragraph length, readability, and how pictures are given. Use it on the
 * site's English player pages and on each mod's `docs/player.md`.
 */
export class PlayerProse {
  /**
   * Words that tell the reader how hard something is. "Above" and "below" stay with review: on
   * these pages they name places on the game's screen and values as often as places on the page.
   */
  private static readonly banned = /\b(?:simply|just|easy|easily)\b/giu;
  /** A screenshot's size limit, the rule's "about 200 KB". */
  public static readonly maxPictureBytes = 200 * 1024;
  private static readonly maxSentenceWords = 25;
  private static readonly maxParagraphSentences = 3;
  private static readonly targetAverageWords = 15;
  private static readonly targetGrade = 7;
  private static readonly frontMatter = /^---\n[\s\S]*?\n---\n/u;
  private static readonly fence = /^\s*(`{3,}|~{3,})/u;
  /** Lines that hold no prose: headings, tables, components, imports, asides and rules. */
  private static readonly notProse = /^\s*(?:#|\||<|import |export |:::|---|\{\/\*)/u;
  private static readonly listItem = /^\s*(?:[-*+]|\d+\.)\s+/u;
  private static readonly image = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/gu;
  private static readonly pictures = /\.(?:webp|avif)$/iu;
  private static readonly loops = /\.(?:mp4|webm)$/iu;
  private static readonly gif = /\.gif$/iu;

  private constructor(private readonly blocks: readonly ProseBlock[]) {}

  /** Reads the prose blocks of a page: paragraphs and list items, without code, tables or markup. */
  public static of(markdown: string): PlayerProse {
    const offset = (PlayerProse.frontMatter.exec(markdown)?.[0] ?? '').split('\n').length - 1;
    const lines = markdown.replace(PlayerProse.frontMatter, '').split('\n');
    const blocks: ProseBlock[] = [];
    let current: ProseBlock | undefined;
    let fenced = false;

    const close = (): void => {
      if (current !== undefined) {
        current.text = PlayerProse.plain(current.text);
        blocks.push(current);
      }

      current = undefined;
    };

    for (const [index, line] of lines.entries()) {
      if (PlayerProse.fence.test(line)) {
        fenced = !fenced;
        close();
        continue;
      }

      if (fenced || line.trim() === '' || PlayerProse.notProse.test(line)) {
        close();
        continue;
      }

      if (PlayerProse.listItem.test(line)) {
        close();
      }

      current ??= { line: index + 1 + offset, text: '' };
      current.text = `${current.text} ${line.replace(PlayerProse.listItem, '').trim()}`;
    }

    close();

    return new PlayerProse(blocks);
  }

  /** The findings that fail a page: banned words, long sentences and long paragraphs. */
  public get errors(): ProseFinding[] {
    return this.blocks.flatMap(({ line, text }) => {
      const sentences = PlayerProse.sentences(text);
      const found: ProseFinding[] = [];

      for (const word of text.match(PlayerProse.banned) ?? []) {
        found.push({ line, message: `"${word}" tells the reader how hard something is` });
      }

      for (const sentence of sentences) {
        const words = PlayerProse.words(sentence).length;

        if (words > PlayerProse.maxSentenceWords) {
          found.push({
            line,
            message: `a sentence of ${words} words; keep it to ${PlayerProse.maxSentenceWords}: "${sentence.slice(0, 60)}…"`,
          });
        }
      }

      if (sentences.length > PlayerProse.maxParagraphSentences) {
        found.push({
          line,
          message: `a paragraph of ${sentences.length} sentences; keep it to ${PlayerProse.maxParagraphSentences}`,
        });
      }

      return found;
    });
  }

  /** The page's average sentence length in words. */
  public get averageWords(): number {
    const sentences = this.blocks.flatMap(({ text }) => PlayerProse.sentences(text));
    const words = sentences.reduce((sum, sentence) => sum + PlayerProse.words(sentence).length, 0);

    return sentences.length === 0 ? 0 : words / sentences.length;
  }

  /** The page's Flesch-Kincaid grade level. */
  public get grade(): number {
    const sentences = this.blocks.flatMap(({ text }) => PlayerProse.sentences(text));
    const words = sentences.flatMap((sentence) => PlayerProse.words(sentence));
    const syllables = words.reduce((sum, word) => sum + PlayerProse.syllables(word), 0);

    if (words.length === 0) {
      return 0;
    }

    return 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
  }

  /** What a maintainer reads, without failing the page: an average or grade above its target. */
  public get warnings(): string[] {
    const warnings: string[] = [];

    if (this.averageWords > PlayerProse.targetAverageWords) {
      warnings.push(
        `sentences average ${this.averageWords.toFixed(1)} words; the target is ${PlayerProse.targetAverageWords}`,
      );
    }

    if (this.grade > PlayerProse.targetGrade) {
      warnings.push(
        `Flesch-Kincaid grade ${this.grade.toFixed(1)}; the target is ${PlayerProse.targetGrade}`,
      );
    }

    return warnings;
  }

  /**
   * The problems with how a page shows pictures: a GIF, a still in another format than WebP or AVIF,
   * a picture without alt text, or a file past `maxBytes` by `size`.
   */
  public static media(
    markdown: string,
    size: (path: string) => number | undefined,
    maxBytes: number,
  ): string[] {
    return [...markdown.matchAll(PlayerProse.image)].flatMap((match) => {
      const alt = (match[1] ?? '').trim();
      const path = match[2] ?? '';
      const bytes = size(path);
      const problems: string[] = [];

      if (PlayerProse.gif.test(path)) {
        problems.push(`${path}: a loop is MP4 or WebM with a poster frame, never GIF`);
      } else if (!PlayerProse.pictures.test(path) && !PlayerProse.loops.test(path)) {
        problems.push(`${path}: a screenshot is WebP or AVIF`);
      }

      if (alt === '') {
        problems.push(`${path}: say in its alt text what to notice`);
      }

      if (bytes !== undefined && bytes > maxBytes) {
        problems.push(
          `${path}: ${Math.round(bytes / 1024)} KB; keep a screenshot to ${maxBytes / 1024} KB`,
        );
      }

      return problems;
    });
  }

  /** Text without Markdown: link text kept, code spans as one word, emphasis and tags dropped. */
  private static plain(text: string): string {
    return text
      .replaceAll(/!\[[^\]]*\]\([^)]*\)/gu, '')
      .replaceAll(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
      .replaceAll(/`[^`]*`/gu, 'code')
      .replaceAll(/<[^>]+>/gu, '')
      .replaceAll(/[*_]/gu, '')
      .replaceAll(/\s+/gu, ' ')
      .trim();
  }

  private static sentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/u)
      .map((sentence) => sentence.trim())
      .filter((sentence) => PlayerProse.words(sentence).length > 0);
  }

  private static words(sentence: string): string[] {
    return sentence.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word));
  }

  /** English syllables by vowel groups, a silent final e dropped, at least one per word. */
  private static syllables(word: string): number {
    const letters = word.toLowerCase().replaceAll(/[^a-z]/gu, '');

    if (letters.length <= 3) {
      return 1;
    }

    const groups = letters.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/u, '').match(/[aeiouy]+/gu);

    return Math.max(1, groups?.length ?? 0);
  }
}
