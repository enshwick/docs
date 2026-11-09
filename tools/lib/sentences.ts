/**
 * Splits plain text into sentences and words in any script, for the player writing rules and the
 * page descriptions packed from whole sentences.
 */
export class Sentences {
  /**
   * A stop (Latin, Cyrillic, Arabic, Devanagari, Greek, Armenian, Ethiopic, Burmese or CJK), then a
   * closing quote or bracket, then the next sentence's opening mark and its first capital, uncased
   * letter or digit. Closing quotes include `“`, which closes a Ukrainian `„…“` quote; the
   * full-width stops of CJK need no space after them.
   */
  private static readonly boundary =
    /(?:[.!?…؟।;։።။]["')\]»”’“」』]*\s+|[。！？]["')\]»”’“」』]*\s*)(?=["'(`[*«“„‘「『¿¡]*[\p{Lu}\p{Lt}\p{Lo}\p{N}])/gu;
  /** A short abbreviation, English or Ukrainian, whose period ends no sentence. */
  private static readonly abbreviation =
    /(?<![\p{L}\p{N}])(?:e\.g|i\.e|etc|vs|див|напр)\.["')\]»”’“]*\s+$/iu;
  /** An abbreviation that ends no sentence when a number follows it: `п. 3`, `рис. 2`, `p. 4`. */
  private static readonly numbered = /(?<![\p{L}\p{N}])(?:п|пп|рис|с|ст|табл|p|pp|no|fig)\.\s+$/iu;
  private static readonly number = /^\p{N}/u;
  private static readonly gap = /\s+/u;
  private static readonly wordLike = /[\p{L}\p{N}]/u;

  /** The text's sentences, each ending at a stop before the next one's capital, uncased letter or digit. */
  public static of(text: string): string[] {
    const sentences: string[] = [];
    let start = 0;

    for (const match of text.matchAll(Sentences.boundary)) {
      const end = match.index + match[0].length;
      const before = text.slice(start, end);
      const numbered = Sentences.numbered.test(before) && Sentences.number.test(text.slice(end));

      if (!Sentences.abbreviation.test(before) && !numbered) {
        sentences.push(before.trim());
        start = end;
      }
    }

    sentences.push(text.slice(start).trim());

    return sentences.filter((sentence) => Sentences.words(sentence).length > 0);
  }

  /** The sentence's words: the parts between spaces that hold a letter or digit. */
  public static words(sentence: string): string[] {
    return sentence.split(Sentences.gap).filter((word) => Sentences.wordLike.test(word));
  }
}
