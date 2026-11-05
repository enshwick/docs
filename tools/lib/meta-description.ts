import { PlayerProse } from './player-prose.ts';

/**
 * A page's meta description, the snippet search engines show: 120 to 160 characters, so it is
 * neither scraped from the page body for being short nor cut off for being long.
 */
export class MetaDescription {
  public static readonly shortest = 120;
  public static readonly longest = 160;
  private static readonly wordGap = /\s+/u;
  private static readonly ellipsis = '…';
  /** A comma or the like that would stand right before the ellipsis. */
  private static readonly trailingPause = /[,;:]$/u;

  private static readonly characters = new Intl.Segmenter();

  /** Its length as a reader counts it, one per character, not per UTF-16 unit. */
  public static lengthOf(text: string): number {
    return Array.from(MetaDescription.characters.segment(text)).length;
  }

  /** Whether the text is as long as a description should be. */
  public static fits(text: string): boolean {
    const length = MetaDescription.lengthOf(text);

    return length >= MetaDescription.shortest && length <= MetaDescription.longest;
  }

  /**
   * The texts' sentences, in order, as many whole ones as fit; when those fall short, the next
   * sentence follows cut at a word, with an ellipsis. Shorter texts stay short.
   */
  public static pack(texts: readonly string[]): string {
    const sentences = texts.flatMap((text) => PlayerProse.sentences(text));
    let packed = '';

    for (const sentence of sentences) {
      const next = packed === '' ? sentence : `${packed} ${sentence}`;

      if (MetaDescription.lengthOf(next) <= MetaDescription.longest) {
        packed = next;
        continue;
      }

      return MetaDescription.lengthOf(packed) < MetaDescription.shortest
        ? MetaDescription.cut(packed, sentence)
        : packed;
    }

    return packed;
  }

  /** `packed` and as many words of `sentence` as fit before the ellipsis. */
  private static cut(packed: string, sentence: string): string {
    let cut = packed;

    for (const word of sentence.split(MetaDescription.wordGap)) {
      const next = cut === '' ? word : `${cut} ${word}`;

      if (MetaDescription.lengthOf(next) + 1 > MetaDescription.longest) {
        break;
      }

      cut = next;
    }

    return `${cut.replace(MetaDescription.trailingPause, '')}${MetaDescription.ellipsis}`;
  }
}
