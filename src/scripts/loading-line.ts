/**
 * A thin flame line at the top of the window while the next page loads. It shows only when a
 * click on a link to another page of the site takes longer than a moment, so a prerendered page,
 * which opens at once, shows nothing.
 */
export class LoadingLine {
  private static readonly className = 'ew-loading';
  /** How long a click may wait before the line shows, in milliseconds. */
  private static readonly delay = 120;

  private timer: number | undefined;

  /** Starts listening for clicks on the page's links. */
  public static start(): void {
    new LoadingLine().listen();
  }

  private listen(): void {
    document.addEventListener('click', (event) => {
      if (LoadingLine.leavesForAPage(event)) {
        this.timer = window.setTimeout(() => {
          document.documentElement.classList.add(LoadingLine.className);
        }, LoadingLine.delay);
      }
    });

    // Back from the history cache, the page must not keep the line it had when it left.
    window.addEventListener('pageshow', () => {
      this.stop();
    });
  }

  private stop(): void {
    window.clearTimeout(this.timer);
    document.documentElement.classList.remove(LoadingLine.className);
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
