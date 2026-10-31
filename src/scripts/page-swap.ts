/**
 * The site moves between pages without loading a new document: Astro's router fetches the next
 * page and swaps it in, so a click answers at once. The swap gives the root element the next
 * page's attributes, and the ones the head's scripts set on the first load are not among them;
 * this sets them on the next page before it is swapped in, from the marks its head carries.
 *
 * The browser's view transition is skipped: it would show snapshots of the page for a moment,
 * and a snapshot of the night is a still picture of a moving one. The content's rise is the
 * stylesheet's, on the live page.
 */
export class PageSwap {
  private static readonly areaMeta = 'meta[name="ew-area"]';
  private static readonly modMeta = 'meta[name="ew-mod"]';

  /** Marks every page the router is about to swap in. */
  public static start(): void {
    new PageSwap().listen();
  }

  private listen(): void {
    document.addEventListener('astro:before-swap', (event) => {
      // Skipping rejects the transition's `ready`; nothing waits on it, and the handler stays
      // synchronous so the skip and the marks land before the router swaps.
      // oxlint-disable-next-line promise/prefer-await-to-then
      event.viewTransition.ready.catch(() => {});
      event.viewTransition.skipTransition();
      PageSwap.mark(event.newDocument);
      event.newDocument.documentElement.dataset['swapped'] = '';
      event.newDocument.documentElement.dataset['swapping'] = '';
    });

    // The router has scrolled the new page into place by now, so later links glide again.
    document.addEventListener('astro:after-swap', () => {
      delete document.documentElement.dataset['swapping'];
    });
  }

  /** Sets the root marks of `page` from its head: the dark theme, the area, a mod's own page. */
  public static mark(page: Document): void {
    const root = page.documentElement;
    const area = page.querySelector<HTMLMetaElement>(PageSwap.areaMeta)?.content;

    root.dataset['theme'] = 'dark';

    if (area === undefined) {
      delete root.dataset['area'];
    } else {
      root.dataset['area'] = area;
    }

    root.toggleAttribute('data-mod', page.querySelector(PageSwap.modMeta) !== null);
  }
}
