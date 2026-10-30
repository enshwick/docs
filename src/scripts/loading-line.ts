/**
 * A thin flame line at the top of the window while the next page loads. The click marks the page
 * at once; the stylesheet shows the line only after a moment, so a prerendered page, which opens
 * at once, shows nothing. The browser stops a leaving page's timers but keeps painting it, so the
 * wait is the stylesheet's, not a timer's.
 */
export class LoadingLine {
  private static readonly className = 'ew-loading';
  /** Starts listening for clicks on the page's links. */
  public static start(): void {
    new LoadingLine().listen();
  }

  private listen(): void {
    document.addEventListener('click', (event) => {
      if (LoadingLine.leavesForAPage(event)) {
        document.documentElement.classList.add(LoadingLine.className);
      }
    });

    // Back from the history cache, the page must not keep the line it had when it left.
    window.addEventListener('pageshow', () => {
      document.documentElement.classList.remove(LoadingLine.className);
    });
  }

  /** Whether the click opens another page of the site in this tab. */
  private static leavesForAPage(event: MouseEvent): boolean {
    const link = event.target instanceof Element ? event.target.closest('a') : null;

    if (
      link === null ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.hasAttribute('download') ||
      (link.target !== '' && link.target !== '_self')
    ) {
      return false;
    }

    const url = new URL(link.href, location.href);

    return (
      url.origin === location.origin &&
      (url.pathname !== location.pathname || url.search !== location.search)
    );
  }
}
