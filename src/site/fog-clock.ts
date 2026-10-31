/** The shader's clock: at most 30 frames a second, and time that stands still while paused. */
export class FogClock {
  /** The shortest time between two frames, in milliseconds, less a little for timer jitter. */
  private static readonly interval = 1000 / 30 - 1;

  private last = Number.NEGATIVE_INFINITY;
  private offset = 0;
  private pausedAt: number | undefined;

  /** Whether a frame at `now` may draw; a drawn frame starts the next interval. */
  public due(now: number): boolean {
    if (now - this.last < FogClock.interval) {
      return false;
    }

    this.last = now;

    return true;
  }

  /** Stops the clock at `now`. */
  public pause(now: number): void {
    this.pausedAt ??= now;
  }

  /** Starts the clock again at `now`, as if no time had passed while it stood. */
  public resume(now: number): void {
    if (this.pausedAt !== undefined) {
      this.offset += now - this.pausedAt;
      this.pausedAt = undefined;
    }
  }

  /** The running time at `now`, in milliseconds. */
  public elapsed(now: number): number {
    return now - this.offset;
  }
}
