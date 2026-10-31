/**
 * A code example the book marks for the site with a pair of comments, `<!-- name -->` and
 * `<!-- /name -->`. The book compiles it as a doctest, so the site shows code that builds.
 */
export class BookSnippet {
  private static readonly fence = /^```[^\n]*\n([\s\S]*?)\n```$/mu;

  /** A chapter's Markdown, as the book holds it. */
  public constructor(private readonly chapter: string) {}

  /** The code of the first block between the comments named `name`; none when there is none. */
  public named(name: string): string | undefined {
    const chapter = this.chapter;
    const start = `<!-- ${name} -->`;
    const end = `<!-- /${name} -->`;
    const from = chapter.indexOf(start);
    const to = chapter.indexOf(end, from);

    if (from === -1 || to === -1) {
      return undefined;
    }

    return BookSnippet.fence.exec(chapter.slice(from + start.length, to))?.[1];
  }
}
