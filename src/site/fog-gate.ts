/** How the hero's fog is drawn. */
export enum FogMode {
  /** The WebGL shader: clouds that form, swell and break up. */
  Shader = 'shader',
  /** The drawn SVG layers, still under reduced motion. */
  Drawn = 'drawn',
}

/** What the browser offers and what the reader asked for. */
export interface FogSupport {
  readonly webgl: boolean;
  readonly reducedMotion: boolean;
}

/** Where the hero is: the tab shown or hidden, the hero on screen or scrolled away. */
export interface FogPlace {
  readonly pageVisible: boolean;
  readonly onScreen: boolean;
}

/** Decides, from what the browser offers, whether the fog shader runs at all, and when it may draw. */
export class FogGate {
  public constructor(private readonly support: FogSupport) {}

  /** The shader where WebGL runs and the reader welcomes motion; the drawn layers otherwise. */
  public get mode(): FogMode {
    return this.support.webgl && !this.support.reducedMotion ? FogMode.Shader : FogMode.Drawn;
  }

  /** Whether frames may be asked for: only in shader mode, the tab shown and the hero on screen. */
  public runs(place: FogPlace): boolean {
    return this.mode === FogMode.Shader && place.pageVisible && place.onScreen;
  }
}
