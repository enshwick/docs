import { ModLanguageKeys } from '../site/mod-language-keys.ts';

/**
 * Keeps the root's chosen mod language on the language tab the reader last picked. Starlight's
 * synced tabs switch the other tab groups and remember the pick; blocks for one language follow
 * the root, through the rules of `ModLanguages.css`.
 */
export class ModLanguage {
  private static readonly datasetKey = 'modLanguage';

  /** Follows every pick from now on; Starlight's own handler on the tab has switched it by then. */
  public static start(): void {
    const follow = (): void => {
      // The selected tab, not storage, so the root follows even where storage is blocked.
      const label = document.querySelector(ModLanguageKeys.selectedTab)?.textContent?.trim();

      if (label !== undefined && label !== '') {
        document.documentElement.dataset[ModLanguage.datasetKey] = label;
      }
    };

    document.addEventListener('click', follow);
    document.addEventListener('keydown', follow);
  }

  /** Gives the page about to be swapped in the current page's choice, which its root lacks. */
  public static carry(next: Document): void {
    const chosen = document.documentElement.dataset[ModLanguage.datasetKey];

    if (chosen !== undefined) {
      next.documentElement.dataset[ModLanguage.datasetKey] = chosen;
    }
  }
}
