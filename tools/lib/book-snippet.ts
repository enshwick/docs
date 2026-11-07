/**
 * A code example the book marks for the site with a `<!-- name -->` comment on the line before
 * it. The book compiles it as a doctest, so the site shows code that builds. A closing
 * `<!-- /name -->` may follow, but none is needed: a line between a Rust block and its Luau twin
 * would split their language switch.
 */
export class BookSnippet {
  private static readonly fence = /^\r?\n```[^\n]*\n([\s\S]*?)\n```(?:\r?\n|$)/u;

  /** A chapter's Markdown, as the book holds it. */
  public constructor(private readonly chapter: string) {}

  /** The code of the block right after the comment named `name`; none when there is none. */
  public named(name: string): string | undefined {
    const start = `<!-- ${name} -->`;
    const from = this.chapter.indexOf(start);

    if (from === -1) {
      return undefined;
    }

    return BookSnippet.fence.exec(this.chapter.slice(from + start.length))?.[1];
  }
}
