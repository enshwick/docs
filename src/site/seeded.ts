/** A seeded Park-Miller generator: the same seed draws the same night on every build. */
export class Seeded {
  private static readonly modulus = 2_147_483_647;
  private static readonly multiplier = 16_807;

  public constructor(private state: number) {}

  /** The next number in `[0, 1)`. */
  public next(): number {
    this.state = (this.state * Seeded.multiplier) % Seeded.modulus;

    return this.state / Seeded.modulus;
  }
}
