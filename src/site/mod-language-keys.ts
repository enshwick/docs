/**
 * The names the mod language switch shares between the build and the browser. It imports nothing,
 * so the browser's script carries these and no data or validation.
 */
export class ModLanguageKeys {
  /** The key every language tab group shares, so one choice holds across the site. */
  public static readonly syncKey = 'mod-language';
  /** Where Starlight's synced tabs remember the chosen tab's label. */
  public static readonly storageKey = `starlight-synced-tabs__${ModLanguageKeys.syncKey}`;
  /** The attribute of a block shown only for one language, holding that language's label. */
  public static readonly onlyAttribute = 'data-only-language';
  /** The root's attribute holding the chosen language's label. */
  public static readonly rootAttribute = 'data-mod-language';
  /** The selected tab of a language tab group. */
  public static readonly selectedTab = `starlight-tabs[data-sync-key="${ModLanguageKeys.syncKey}"] [role="tab"][aria-selected="true"]`;
}
