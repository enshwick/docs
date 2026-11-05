/**
 * The language picker opens the chosen language's page with a full load, so the search and the
 * page scripts start fresh there. A select drawn in the base look opens its list on an arrow key;
 * a native one changes its value at once, so there a choice made with the keys waits for Enter.
 */
export class LanguageSelect {
  private static readonly selector = 'select.ew-lang__select';
  private static readonly enter = 'Enter';
  private static readonly browseKeys: ReadonlySet<string> = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'PageUp',
    'PageDown',
  ]);

  private browsing = false;

  private constructor(private readonly waitsForEnter: boolean) {}

  /** Listens to every language picker on this and later pages. */
  public static start(): void {
    new LanguageSelect(!CSS.supports('appearance', 'base-select')).listen();
  }

  private listen(): void {
    document.addEventListener('keydown', (event) => {
      const select = LanguageSelect.of(event.target);

      if (select === undefined || !this.waitsForEnter) {
        return;
      }

      if (event.key === LanguageSelect.enter) {
        LanguageSelect.open(select);

        return;
      }

      if (LanguageSelect.browseKeys.has(event.key)) {
        this.browsing = true;
      }
    });

    document.addEventListener('change', (event) => {
      const select = LanguageSelect.of(event.target);

      if (select !== undefined && !this.browsing) {
        LanguageSelect.open(select);
      }
    });

    document.addEventListener('focusout', (event) => {
      const select = LanguageSelect.of(event.target);

      if (select !== undefined) {
        this.browsing = false;
        LanguageSelect.reset(select);
      }
    });

    // A page restored from the back cache keeps the choice that left it; it shows its own language.
    window.addEventListener('pageshow', () => {
      for (const select of document.querySelectorAll<HTMLSelectElement>(LanguageSelect.selector)) {
        LanguageSelect.reset(select);
      }
    });
  }

  private static of(target: EventTarget | null): HTMLSelectElement | undefined {
    return target instanceof HTMLSelectElement && target.matches(LanguageSelect.selector)
      ? target
      : undefined;
  }

  private static open(select: HTMLSelectElement): void {
    if (select.selectedOptions[0]?.defaultSelected === false) {
      window.location.assign(select.value);
    }
  }

  private static reset(select: HTMLSelectElement): void {
    for (const option of select.options) {
      option.selected = option.defaultSelected;
    }
  }
}
