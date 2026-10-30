import { Seeded } from './seeded.ts';

/** A star's fast, irregular flicker: one of three patterns, its period and phase in seconds. */
export interface Flicker {
  readonly pattern: 1 | 2 | 3;
  readonly period: number;
  readonly delay: number;
}

/** One star: where it sits, how bright it is and how it breathes, each on its own period. */
export interface Star {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly opacity: number;
  /** The slow breath's period and phase in seconds. */
  readonly breathe: number;
  readonly breatheDelay: number;
  readonly flicker: Flicker | undefined;
}

/** How a ridge is drawn: the height its line wanders around, how rough it is, and its seed. */
export interface RidgeShape {
  readonly base: number;
  readonly rough: number;
  readonly seed: number;
}

/** A ridge as an SVG path closed along the bottom, and its highest point. */
export interface Ridge {
  readonly path: string;
  readonly summit: { readonly x: number; readonly y: number };
}

/** A star field: its seed, how many stars, and the area they spread over. */
export interface StarField {
  readonly seed: number;
  readonly count: number;
  readonly width: number;
  readonly height: number;
}

/** One night: its star field, the art box of its ridges and the two ridges, back first. */
export interface NightScene {
  readonly field: StarField;
  readonly box: ArtBox;
  readonly ridges: readonly [RidgeShape, RidgeShape];
}

/** The art box every night layer is drawn in; the page scales it with `slice`. */
export interface ArtBox {
  readonly width: number;
  readonly height: number;
  /** The highest and lowest a ridge line may go. */
  readonly top: number;
  readonly bottom: number;
}

/**
 * The night drawn in code: a star field whose stars breathe and flicker out of step, and mountain
 * ridges by midpoint displacement with one main summit. Pure and seeded, so a build is repeatable.
 */
export class Night {
  /** The front page's first screen: about 70 stars and two ridges, one main summit. */
  public static readonly hero = new Night({
    field: { seed: 11, count: 70, width: 1600, height: 520 },
    box: { width: 1600, height: 900, top: 330, bottom: 880 },
    ridges: [
      { base: 690, rough: 264, seed: 97 },
      { base: 800, rough: 180, seed: 211 },
    ],
  });

  /** A doc page: fewer, fainter stars over the window and a low strip of ridges at its bottom. */
  public static readonly page = new Night({
    field: { seed: 29, count: 56, width: 1440, height: 760 },
    box: { width: 1600, height: 400, top: 60, bottom: 390 },
    ridges: [
      { base: 230, rough: 150, seed: 97 },
      { base: 300, rough: 100, seed: 211 },
    ],
  });

  private static readonly controlPoints = 7;
  private static readonly subdivisions = 6;
  private static readonly flickerShare = 0.5;
  private static readonly bigShare = 0.9;

  public constructor(public readonly scene: NightScene) {}

  /** The scene's stars. */
  public get stars(): Star[] {
    return Night.stars(this.scene.field);
  }

  /** The scene's two ridges, back first. */
  public get ridges(): [Ridge, Ridge] {
    const [back, front] = this.scene.ridges;

    return [Night.ridge(back, this.scene.box), Night.ridge(front, this.scene.box)];
  }

  /** The field's stars, denser and brighter towards the top. */
  public static stars(field: StarField): Star[] {
    const { seed, count, width, height } = field;
    const random = new Seeded(seed);
    const stars: Star[] = [];

    for (let index = 0; index < count; index += 1) {
      const x = Math.round(random.next() * width);
      const y = random.next() ** 1.8 * height;
      const big = random.next() > Night.bigShare;
      const radius = big ? 1.4 : Night.round(0.5 + random.next() * 0.6, 2);
      const opacity = Night.round(0.15 + random.next() * 0.45 * (1 - y / (height * 1.15)), 2);
      const breathe = Night.round(6 + random.next() * 9, 1);
      const breatheDelay = Night.round(random.next() * 15, 1);
      const flickers = random.next() > Night.flickerShare;
      const flicker: Flicker | undefined = flickers
        ? {
            pattern: Night.pattern(1 + Math.floor(random.next() * 3)),
            period: Night.round(1 + random.next() * 2, 2),
            delay: Night.round(random.next() * 3, 2),
          }
        : undefined;

      stars.push({ x, y: Math.round(y), radius, opacity, breathe, breatheDelay, flicker });
    }

    return stars;
  }

  /**
   * A ridge: seven control points at random heights, one pushed up into the main summit, then
   * midpoint displacement with falling roughness, and a gentle sideways wobble.
   */
  public static ridge(shape: RidgeShape, box: ArtBox): Ridge {
    const random = new Seeded(shape.seed);
    let points = Array.from(
      { length: Night.controlPoints },
      () => shape.base + (random.next() - 0.5) * shape.rough * 1.1,
    );
    const top = 1 + Math.floor(random.next() * (Night.controlPoints - 2));

    points[top] = shape.base - shape.rough * (0.45 + random.next() * 0.25);

    let amplitude = shape.rough * 0.6;

    for (let round = 0; round < Night.subdivisions; round += 1) {
      const next: number[] = [];

      for (let index = 0; index < points.length - 1; index += 1) {
        const here = points[index] ?? shape.base;
        const there = points[index + 1] ?? shape.base;

        next.push(here, (here + there) / 2 + (random.next() - 0.5) * amplitude);
      }

      next.push(points.at(-1) ?? shape.base);
      points = next;
      amplitude *= 0.52;
    }

    const ys = points.map((y) => Math.min(Math.max(y, box.top), box.bottom));
    const phase = random.next() * 6.28;
    const phase2 = random.next() * 6.28;
    const last = ys.length - 1;
    const xs = ys.map((_, index) => {
      const u = index / last;

      return (
        box.width *
        (u + 0.035 * Math.sin(u * 6.28 * 1.5 + phase) + 0.02 * Math.sin(u * 6.28 * 3.3 + phase2))
      );
    });
    const line = ys
      .map((y, index) => `${index === 0 ? 'M' : 'L'}${(xs[index] ?? 0).toFixed(1)} ${y.toFixed(1)}`)
      .join(' ');
    const highest = ys.reduce((best, y, index) => (y < (ys[best] ?? Infinity) ? index : best), 0);

    return {
      path: `${line} L${box.width} ${box.height} L0 ${box.height} Z`,
      summit: { x: xs[highest] ?? 0, y: ys[highest] ?? box.bottom },
    };
  }

  /** The stars as SVG circles; their colour and motion come from the stylesheet. */
  public static starMarkup(stars: readonly Star[]): string {
    return stars
      .map((star) => {
        const flicker = star.flicker;
        const classes = flicker === undefined ? 'ew-star' : `ew-star ew-star--f${flicker.pattern}`;
        const style = [
          `--b:${star.breathe}s`,
          `--bd:-${star.breatheDelay}s`,
          ...(flicker === undefined ? [] : [`--t:${flicker.period}s`, `--td:-${flicker.delay}s`]),
        ].join(';');

        return `<circle class="${classes}" style="${style}" cx="${star.x}" cy="${star.y}" r="${star.radius}" opacity="${star.opacity}"/>`;
      })
      .join('');
  }

  private static pattern(value: number): Flicker['pattern'] {
    return value === 1 || value === 2 ? value : 3;
  }

  private static round(value: number, digits: number): number {
    return Number(value.toFixed(digits));
  }
}
