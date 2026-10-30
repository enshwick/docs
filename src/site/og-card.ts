import { mkdir } from 'node:fs/promises';

import type { OGImageOptions } from 'astro-og-canvas';
import sharp from 'sharp';

import { Night } from './night.ts';

/** The three kinds of card: a plain page, a mod's page with a mist edge, an error's with a flame edge. */
export enum OgKind {
  Page = 'page',
  Mod = 'mod',
  Error = 'error',
}

/** What a page's social card shows: its title and description, and whether it is a mod or an error. */
export interface OgPage {
  readonly title: string;
  readonly description?: string | undefined;
  readonly mod?: unknown;
  readonly error?: unknown;
}

/**
 * The social card of a page: its title and description over the hero's night, drawn once per
 * build from the same seeded stars and ridges. A mod's card and an error's card each carry an
 * edge of their own: the mist for a mod, the flame for an error.
 */
export class OgCard {
  private static readonly width = 1200;
  private static readonly height = 630;
  private static readonly backgroundFolder = 'node_modules/.astro-og-canvas';
  /** The edge each kind of card carries, drawn into its background. */
  private static readonly edges: Record<OgKind, string> = {
    [OgKind.Page]: '',
    [OgKind.Mod]: '<rect x="0" y="948" width="1600" height="12" fill="#8c8fd6"/>',
    [OgKind.Error]: '<rect x="0" y="0" width="14" height="960" fill="#ff8a3d"/>',
  };
  private static readonly fonts = [
    './node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff',
    './node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-600-normal.woff',
    './node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff',
    './node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-cyrillic-400-normal.woff',
  ];

  /** The brand's colours as the image library takes them. */
  private static readonly colors = {
    basalt: [20, 18, 26],
    bone: [233, 225, 211],
    muted: [189, 182, 201],
  } as const;

  public constructor(private readonly page: OgPage) {}

  /** The kind of card the page gets. */
  public get kind(): OgKind {
    if (this.page.error !== undefined) {
      return OgKind.Error;
    }

    return this.page.mod === undefined ? OgKind.Page : OgKind.Mod;
  }

  /** Draws the night once per kind into the images the cards lie on, and returns their paths. */
  public static async backgrounds(): Promise<Record<OgKind, string>> {
    await mkdir(OgCard.backgroundFolder, { recursive: true });

    const [page, mod, error] = await Promise.all([
      OgCard.background(OgKind.Page),
      OgCard.background(OgKind.Mod),
      OgCard.background(OgKind.Error),
    ]);

    return { [OgKind.Page]: page, [OgKind.Mod]: mod, [OgKind.Error]: error };
  }

  private static async background(kind: OgKind): Promise<string> {
    const [back, front] = Night.hero.ridges;
    const stars = Night.hero.stars
      .map(
        (star) =>
          `<circle cx="${star.x}" cy="${star.y}" r="${star.radius * 1.4}" fill="#e9e1d3" opacity="${star.opacity}"/>`,
      )
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OgCard.width}" height="${OgCard.height}" viewBox="0 60 1600 840" preserveAspectRatio="xMidYMax slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0d1f"/><stop offset=".45" stop-color="#14121c"/><stop offset="1" stop-color="#14121a"/></linearGradient>
<radialGradient id="glow" cx=".5" cy="-.1" r=".7"><stop offset="0" stop-color="#3d3770" stop-opacity=".35"/><stop offset="1" stop-color="#3d3770" stop-opacity="0"/></radialGradient>
<linearGradient id="veil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14121a" stop-opacity=".8"/><stop offset=".7" stop-color="#14121a" stop-opacity="0"/></linearGradient>
</defs>
<rect y="0" width="1600" height="960" fill="url(#sky)"/><rect y="0" width="1600" height="960" fill="url(#glow)"/>
${stars}<path d="${back.path}" fill="#17141f"/><path d="${front.path}" fill="#0f0d14"/>
<rect y="0" width="1600" height="960" fill="url(#veil)"/>${OgCard.edges[kind]}
</svg>`;
    const path = `${OgCard.backgroundFolder}/night-${kind}.png`;

    await sharp(Buffer.from(svg)).png().toFile(path);

    return `./${path}`;
  }

  /** The card's options for the image library, over the night of its kind among `backgrounds`. */
  public options(backgrounds: Readonly<Record<OgKind, string>>): OGImageOptions {
    // The display serif sets old-style figures, so an error code reads better in the body face.
    const titleFace = this.kind === OgKind.Error ? 'IBM Plex Sans' : 'Cormorant Garamond';

    return {
      title: this.page.title,
      description: this.page.description ?? '',
      bgGradient: [[...OgCard.colors.basalt]],
      bgImage: { path: backgrounds[this.kind], fit: 'cover', position: 'center' },
      logo: { path: './public/apple-touch-icon-180.png', size: [72] },
      padding: 72,
      fonts: OgCard.fonts,
      font: {
        title: {
          families: [titleFace],
          weight: this.kind === OgKind.Error ? 'Normal' : 'SemiBold',
          size: this.kind === OgKind.Error ? 60 : 76,
          lineHeight: 1.05,
          color: [...OgCard.colors.bone],
        },
        description: {
          families: ['IBM Plex Sans'],
          weight: 'Normal',
          size: 30,
          lineHeight: 1.4,
          color: [...OgCard.colors.muted],
        },
      },
    };
  }
}
