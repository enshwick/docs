/**
 * Marks, in the front page's floating section list, the section the reader is in. Without
 * scripting the list still jumps to each section; only the mark stays on the first.
 */
export class SectionMarker {
  private static readonly linkSelector = '.ew-onpage a[href^="#"]';
  private static readonly current = 'aria-current';
  /** The band of the window that decides the current section: a line a third of the way down. */
  private static readonly band = '-33% 0px -66% 0px';

  private constructor(private readonly links: readonly HTMLAnchorElement[]) {}

  /** Starts watching the sections the list names. */
  public static start(): void {
    const links = [...document.querySelectorAll<HTMLAnchorElement>(SectionMarker.linkSelector)];

    if (links.length === 0) {
      return;
    }

    new SectionMarker(links).watch();
  }

  private watch(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        const shown = entries.find((entry) => entry.isIntersecting);

        if (shown !== undefined) {
          this.mark(shown.target.id);
        }
      },
      { rootMargin: SectionMarker.band },
    );

    for (const link of this.links) {
      const section = document.querySelector(link.hash);

      if (section !== null) {
        observer.observe(section);
      }
    }
  }

  private mark(id: string): void {
    for (const link of this.links) {
      if (link.hash === `#${id}`) {
        link.setAttribute(SectionMarker.current, 'true');
      } else {
        link.removeAttribute(SectionMarker.current);
      }
    }
  }
}
