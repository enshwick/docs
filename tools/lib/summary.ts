/** A Diátaxis page type, as every developer page declares it. */
export type PageType = 'tutorial' | 'how-to' | 'reference' | 'explanation';

/** One entry of the book's summary: a chapter with the chapters nested under it. */
export interface SummaryChapter {
  readonly title: string;
  readonly path: string;
  readonly children: readonly SummaryChapter[];
}

/** One part of the book's summary: an optional part title over its chapters. */
export interface SummaryPart {
  readonly title: string | undefined;
  readonly chapters: readonly SummaryChapter[];
}

/** A sidebar entry in the shape Starlight's configuration takes. */
export type SidebarEntry =
  | { readonly slug: string; readonly label: string }
  | {
      readonly label: string;
      readonly items: readonly SidebarEntry[];
      readonly collapsed?: boolean;
    };

/** The mdBook summary, `SUMMARY.md`: parts, chapters and their nesting. */
export class Summary {
  private static readonly chapterLine = /^(\s*)[-*] \[([^\]]+)\]\(([^)]+)\)\s*$/u;
  private static readonly prefixLine = /^\[([^\]]+)\]\(([^)]+)\)\s*$/u;
  private static readonly partLine = /^# (.+)$/u;
  private static readonly indentWidth = 2;
  /** The label a group's own chapter takes inside the group. */
  private static readonly overview = 'Overview';

  private constructor(public readonly parts: readonly SummaryPart[]) {}

  /** Reads the summary's text; lines it does not know (comments, the book's title) are skipped. */
  public static parse(text: string): Summary {
    const parts: { title: string | undefined; chapters: SummaryChapter[] }[] = [];
    const stack: { depth: number; children: SummaryChapter[] }[] = [];
    let current = { title: undefined as string | undefined, chapters: [] as SummaryChapter[] };

    parts.push(current);

    for (const line of text.split('\n')) {
      const part = Summary.partLine.exec(line)?.[1];

      const isBookTitle = parts.length === 1 && current.chapters.length === 0;

      if (part !== undefined && isBookTitle) {
        continue;
      }

      if (part !== undefined) {
        current = { title: part, chapters: [] };
        parts.push(current);
        stack.length = 0;
        continue;
      }

      const entry = Summary.entry(line);

      if (entry === undefined) {
        continue;
      }

      while ((stack.at(-1)?.depth ?? -1) >= entry.depth) {
        stack.pop();
      }

      (stack.at(-1)?.children ?? current.chapters).push(entry.chapter);
      stack.push({ depth: entry.depth, children: entry.chapter.children });
    }

    return new Summary(parts.filter((part) => part.chapters.length > 0));
  }

  /** A chapter line with its nesting depth; a prefix chapter, outside any list, has depth 0. */
  private static entry(
    line: string,
  ): { depth: number; chapter: SummaryChapter & { children: SummaryChapter[] } } | undefined {
    const listed = Summary.chapterLine.exec(line);
    const match = listed ?? Summary.prefixLine.exec(line);
    const title = listed === null ? match?.[1] : listed[2];
    const path = listed === null ? match?.[2] : listed[3];

    if (title === undefined || path === undefined) {
      return undefined;
    }

    const depth = listed === null ? 0 : (listed[1] ?? '').length / Summary.indentWidth;

    return { depth, chapter: { title, path, children: [] } };
  }

  /** Every chapter in reading order, nested ones after their parent, each with its part's title. */
  public get chapters(): readonly { chapter: SummaryChapter; part: string | undefined }[] {
    const all: { chapter: SummaryChapter; part: string | undefined }[] = [];
    const walk = (chapters: readonly SummaryChapter[], part: string | undefined): void => {
      for (const chapter of chapters) {
        all.push({ chapter, part });
        walk(chapter.children, part);
      }
    };

    for (const part of this.parts) {
      walk(part.chapters, part.title);
    }

    return all;
  }

  /**
   * The sidebar of the book under `prefix`, such as `dev` or `dev/0.3`. A chapter with children
   * becomes a group that opens with the chapter as its overview; a part whose first chapter has the
   * part's own name takes that chapter's pages in, so no group repeats itself.
   */
  public sidebar(slugOf: (path: string) => string): SidebarEntry[] {
    const entry = (chapter: SummaryChapter): SidebarEntry =>
      chapter.children.length === 0
        ? { slug: slugOf(chapter.path), label: chapter.title }
        : {
            label: chapter.title,
            collapsed: true,
            items: [
              { slug: slugOf(chapter.path), label: Summary.overview },
              ...chapter.children.map(entry),
            ],
          };
    const part = (title: string, chapters: readonly SummaryChapter[]): SidebarEntry => {
      const [first, ...rest] = chapters.map((chapter) => entry(chapter));
      const items =
        first !== undefined && 'items' in first && first.label === title
          ? [...first.items, ...rest]
          : chapters.map((chapter) => entry(chapter));

      return { label: title, collapsed: true, items };
    };

    return this.parts.flatMap((section): SidebarEntry[] =>
      section.title === undefined
        ? section.chapters.map((chapter) => entry(chapter))
        : [part(section.title, section.chapters)],
    );
  }

  /** The labels of every group, at any depth, whose first item carries the group's own label. */
  public static repeats(entries: readonly SidebarEntry[]): string[] {
    return entries.flatMap((entry): string[] => {
      if (!('items' in entry)) {
        return [];
      }

      const own = entry.items[0]?.label === entry.label ? [entry.label] : [];

      return [...own, ...Summary.repeats(entry.items)];
    });
  }
}
