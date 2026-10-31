/** A flicker pattern: keyframes as `[at, opacity]`, `at` from 0 to 1, as in night.css. */
type Pattern = ReadonlyArray<readonly [number, number]>;

/** A star's fast flicker: one of three patterns, its period and phase in seconds. */
export interface StarFlicker {
  readonly pattern: 1 | 2 | 3;
  readonly period: number;
  readonly delay: number;
}

const PATTERNS: Readonly<Record<1 | 2 | 3, Pattern>> = {
  1: [
    [0, 0.9],
    [0.07, 0.55],
    [0.11, 0.95],
    [0.26, 0.7],
    [0.31, 1],
    [0.58, 0.6],
    [0.63, 0.9],
    [0.81, 0.75],
    [1, 0.9],
  ],
  2: [
    [0, 0.8],
    [0.14, 1],
    [0.19, 0.5],
    [0.23, 0.85],
    [0.47, 0.7],
    [0.52, 1],
    [0.74, 0.6],
    [0.79, 0.95],
    [1, 0.8],
  ],
  3: [
    [0, 1],
    [0.09, 0.7],
    [0.34, 0.95],
    [0.38, 0.45],
    [0.42, 0.9],
    [0.69, 0.8],
    [0.88, 0.55],
    [0.92, 1],
    [1, 1],
  ],
};

/** How dim the breath goes at its lowest. */
const BREATH_LOW = 0.35;

/**
 * How bright one star is at a moment, as a factor of its own opacity: a slow breath (1 down to 0.35
 * and back, eased, on its own period) times an optional fast flicker on one of three irregular
 * patterns. The same curves night.css gives the drawn stars, so the canvas and the SVG fallback look
 * alike.
 */
export class StarLight {
  public constructor(
    private readonly breathe: number,
    private readonly breatheDelay: number,
    private readonly flicker: StarFlicker | undefined,
  ) {}

  /** The star's light at `seconds`. */
  public at(seconds: number): number {
    const flicker = this.flicker;

    return (
      this.breath(seconds) * (flicker === undefined ? 1 : StarLight.flickerAt(seconds, flicker))
    );
  }

  /** The breath at `seconds`: an alternating ease-in-out from 1 to 0.35, shifted by its delay. */
  public breath(seconds: number): number {
    const phase = (seconds + this.breatheDelay) / this.breathe;
    const cycle = Math.floor(phase);
    const along = cycle % 2 === 0 ? phase - cycle : 1 - (phase - cycle);
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * along);

    return 1 + (BREATH_LOW - 1) * eased;
  }

  /** The flicker at `seconds`, linear between its pattern's keyframes. */
  public static flickerAt(seconds: number, flicker: StarFlicker): number {
    const keys = PATTERNS[flicker.pattern];
    const along = ((((seconds + flicker.delay) / flicker.period) % 1) + 1) % 1;
    let before: readonly [number, number] = [0, 1];

    for (const key of keys) {
      const [at, value] = key;

      if (along <= at) {
        const [from, start] = before;

        return at === from ? value : start + ((value - start) * (along - from)) / (at - from);
      }

      before = key;
    }

    return before[1];
  }
}
