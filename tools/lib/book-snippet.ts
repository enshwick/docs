/**
 * A Rust example the book marks for the site with a `<!-- name -->` comment on the line before it.
 * The book compiles it as a doctest, so the site shows code that builds. A closing `<!-- /name -->`
 * may follow, but none is needed: a line between a Rust block and its Luau twin would split their
 * language switch. When the switch has made them tabs, the Rust tab is taken.
 */
export class BookSnippet {
  /** Blank lines and the switch's tab tags, then a Rust block. */
  private static readonly fence =
    /^(?:[ \t]*(?:<Tabs\b[^>\n]*>|<TabItem\b[^>\n]*>)?[ \t]*\r?\n)*?```rust\b[^\n]*\n([\s\S]*?)\n```(?:\r?\n|$)/u;

  /** A chapter's Markdown, as the book holds it or as the language switch made it. */
  public constructor(private readonly chapter: string) {}

  /** The code of the Rust block right after the comment named `name`; none when there is none. */
  public named(name: string): string | undefined {
    const start = `<!-- ${name} -->`;
    const from = this.chapter.indexOf(start);

    if (from === -1) {
      return undefined;
    }

    return BookSnippet.fence.exec(this.chapter.slice(from + start.length))?.[1];
  }
}
