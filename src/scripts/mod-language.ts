import { ModLanguages } from '../site/mod-languages.ts';

/**
 * Keeps the root's chosen mod language on the reader's last pick in a language tab. Starlight's
 * synced tabs switch the other tab groups and remember the pick; blocks for one language follow
 * the root, through the rules of {@link ModLanguages.css}.
 */
export class ModLanguage {
  private static readonly datasetKey = 'modLanguage';

  /** Follows every pick from now on; Starlight's own handler on the tab has stored it by then. */
  public static start(): void {
    const follow = (): void => {
      const chosen = ModLanguage.stored();

      if (chosen !== undefined) {
        document.documentElement.dataset[ModLanguage.datasetKey] = chosen;
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

  /** The remembered pick, or nothing when there is none or storage is blocked. */
  private static stored(): string | undefined {
    try {
      return localStorage.getItem(ModLanguages.storageKey) ?? undefined;
    } catch {
      return undefined;
    }
  }
}
