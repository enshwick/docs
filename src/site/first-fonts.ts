import cormorantCyrillic from '@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-600-normal.woff2?url';
import cormorantLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2?url';
import plexCyrillic from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-cyrillic-400-normal.woff2?url';
import plexLatin from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';

/**
 * The font files every first screen sets, the display heading and the body text, which a page
 * asks for early so its first paint has them. A page in Latin script needs the Latin subsets; a
 * page in Cyrillic needs both, for names and code.
 */
export class FirstFonts {
  public constructor(private readonly cyrillic: boolean) {}

  /** The addresses of the files to preload. */
  public get urls(): readonly string[] {
    return this.cyrillic
      ? [cormorantLatin, plexLatin, cormorantCyrillic, plexCyrillic]
      : [cormorantLatin, plexLatin];
  }
}
