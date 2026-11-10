import { createRequire } from 'node:module';

import CanvasKitInit from 'canvaskit-wasm/full';
import type { CanvasKit, FontMgr, Image, Paragraph } from 'canvaskit-wasm/full';
import sharp from 'sharp';

import { OgCard, OgKind } from './og-card.ts';
import type { OgPage } from './og-card.ts';

/** How one kind of text on the card is set at full scale. */
interface Face {
  readonly families: readonly string[];
  readonly weight: 'Normal' | 'SemiBold';
  readonly size: number;
  readonly lineHeight: number;
  readonly color: readonly [number, number, number];
}

/** What every card is drawn with, loaded once per build. */
interface Tools {
  readonly kit: CanvasKit;
  readonly fonts: FontMgr;
  readonly night: Image;
  readonly logo: Image;
}

/** A card's title and description laid out at one type scale. */
interface Layout {
  readonly title: Paragraph;
  readonly description: Paragraph;
  readonly gap: number;
}

/**
 * A repository's social preview on GitHub: its title and description over the site's night, at
 * the 1280x640 GitHub asks for. The type shrinks in steps until the text fits; a title and
 * description that do not fit at the smallest step are refused, never clipped.
 */
export class RepositoryCard {
  public static readonly width = 1280;
  public static readonly height = 640;
  /** GitHub crops some views of a preview to its middle 1200x600, so only the night goes outside. */
  private static readonly inset = { x: 40, y: 20 } as const;
  private static readonly padding = 56;
  private static readonly logoSize = 72;
  private static readonly column = 1032;
  /** The type scales tried in turn; the last is the smallest the card sets. */
  private static readonly scales = [1, 0.95, 0.9, 0.85, 0.8] as const;
  private static readonly gap = 24;
  private static readonly title: Face = {
    families: ['Cormorant Garamond'],
    weight: 'SemiBold',
    size: 76,
    lineHeight: 1.05,
    color: OgCard.colors.bone,
  };
  private static readonly description: Face = {
    families: ['IBM Plex Sans'],
    weight: 'Normal',
    size: 30,
    lineHeight: 1.4,
    color: OgCard.colors.muted,
  };
  private static readonly wasm = 'canvaskit-wasm/bin/full/';
  private static readonly unfit = 'does not fit a repository card at the smallest type';
  private static readonly undrawn = 'the repository card could not be drawn';
  private static loaded: Promise<Tools> | undefined;

  public constructor(private readonly card: OgPage) {}

  private static get left(): number {
    return RepositoryCard.inset.x + RepositoryCard.padding;
  }

  private static get top(): number {
    return RepositoryCard.inset.y + RepositoryCard.padding;
  }

  /** The highest the text may start: under the logo. */
  private static get textTop(): number {
    return RepositoryCard.top + RepositoryCard.logoSize + RepositoryCard.padding;
  }

  private static get bottom(): number {
    return RepositoryCard.height - RepositoryCard.top;
  }

  /** Whether the card's title and description fit at one of its type scales. */
  public async fits(): Promise<boolean> {
    const layout = this.layout(await RepositoryCard.tools());

    if (layout === undefined) {
      return false;
    }

    RepositoryCard.release(layout);

    return true;
  }

  /**
   * Draws the card as a PNG.
   *
   * @throws RangeError when the title and description do not fit at the smallest type.
   */
  public async png(): Promise<Uint8Array<ArrayBuffer>> {
    const tools = await RepositoryCard.tools();
    const layout = this.layout(tools);

    if (layout === undefined) {
      throw new RangeError(`${this.card.title}: ${RepositoryCard.unfit}`);
    }

    const surface = tools.kit.MakeSurface(RepositoryCard.width, RepositoryCard.height);

    if (surface === null) {
      throw new Error(RepositoryCard.undrawn);
    }

    const canvas = surface.getCanvas();
    const textHeight = RepositoryCard.textHeight(layout);
    // As the page cards do: the text sits low, but never more than a padding below the logo.
    const top = Math.max(
      RepositoryCard.textTop,
      Math.min(RepositoryCard.textTop + RepositoryCard.padding, RepositoryCard.bottom - textHeight),
    );

    canvas.drawImage(tools.night, 0, 0);
    canvas.drawImage(tools.logo, RepositoryCard.left, RepositoryCard.top);
    canvas.drawParagraph(layout.title, RepositoryCard.left, top);
    canvas.drawParagraph(
      layout.description,
      RepositoryCard.left,
      top + layout.title.getHeight() + layout.gap,
    );

    const snapshot = surface.makeImageSnapshot();
    const png = snapshot.encodeToBytes();

    snapshot.delete();
    surface.dispose();
    RepositoryCard.release(layout);

    if (png === null) {
      throw new Error(RepositoryCard.undrawn);
    }

    return new Uint8Array(png);
  }

  /** The card's text at the largest type scale it fits, or nothing when none fits. */
  private layout(tools: Tools): Layout | undefined {
    for (const scale of RepositoryCard.scales) {
      const layout = {
        title: RepositoryCard.paragraph(tools, this.card.title, RepositoryCard.title, scale),
        description: RepositoryCard.paragraph(
          tools,
          this.card.description ?? '',
          RepositoryCard.description,
          scale,
        ),
        gap: RepositoryCard.gap * scale,
      };
      const fits =
        Math.max(layout.title.getLongestLine(), layout.description.getLongestLine()) <=
          RepositoryCard.column &&
        RepositoryCard.textHeight(layout) <= RepositoryCard.bottom - RepositoryCard.textTop;

      if (fits) {
        return layout;
      }

      RepositoryCard.release(layout);
    }

    return undefined;
  }

  private static textHeight(layout: Layout): number {
    return layout.title.getHeight() + layout.gap + layout.description.getHeight();
  }

  private static paragraph(tools: Tools, text: string, face: Face, scale: number): Paragraph {
    const { kit } = tools;
    const builder = kit.ParagraphBuilder.Make(
      new kit.ParagraphStyle({
        textStyle: {
          color: kit.Color(...face.color),
          fontFamilies: [...face.families],
          fontSize: face.size * scale,
          fontStyle: { weight: kit.FontWeight[face.weight] },
          heightMultiplier: face.lineHeight,
        },
      }),
      tools.fonts,
    );

    builder.addText(text);

    const paragraph = builder.build();

    builder.delete();
    paragraph.layout(RepositoryCard.column);

    return paragraph;
  }

  /** Frees a layout's paragraphs, which live in CanvasKit's memory, not JavaScript's. */
  private static release(layout: Layout): void {
    layout.title.delete();
    layout.description.delete();
  }

  private static tools(): Promise<Tools> {
    RepositoryCard.loaded ??= RepositoryCard.load();

    return RepositoryCard.loaded;
  }

  private static async load(): Promise<Tools> {
    const { resolve } = createRequire(import.meta.url);
    const kit = await CanvasKitInit({
      locateFile: (file) => resolve(`${RepositoryCard.wasm}${file}`),
    });
    const [fonts, night, logo] = await Promise.all([
      Promise.all(OgCard.fonts.map((font) => Bun.file(font).arrayBuffer())),
      OgCard.night(OgKind.Page, RepositoryCard.width, RepositoryCard.height),
      sharp(OgCard.logo)
        .resize(RepositoryCard.logoSize, RepositoryCard.logoSize, { kernel: 'lanczos3' })
        .png()
        .toBuffer(),
    ]);
    const fontManager = kit.FontMgr.FromData(...fonts);
    const nightImage = kit.MakeImageFromEncoded(night);
    const logoImage = kit.MakeImageFromEncoded(logo);

    if (fontManager === null || nightImage === null || logoImage === null) {
      throw new Error(RepositoryCard.undrawn);
    }

    return { kit, fonts: fontManager, night: nightImage, logo: logoImage };
  }
}
