import { describe, expect, it } from 'vitest';

import { StarLight } from '../star-light.ts';

describe('StarLight', () => {
  it('breathes from full down to 0.35 and back over two periods', () => {
    const star = new StarLight(10, 0, undefined);

    expect(star.at(0)).toBeCloseTo(1);
    expect(star.at(10)).toBeCloseTo(0.35);
    expect(star.at(20)).toBeCloseTo(1);
    expect(star.at(5)).toBeCloseTo(0.675);
  });

  it('shifts the breath by its delay, so stars never breathe together', () => {
    expect(new StarLight(10, 10, undefined).at(0)).toBeCloseTo(0.35);
  });

  it('follows the flicker keyframes and repeats them each period', () => {
    expect(StarLight.flickerAt(0, { pattern: 1, period: 2, delay: 0 })).toBeCloseTo(0.9);
    expect(StarLight.flickerAt(0.14, { pattern: 1, period: 2, delay: 0 })).toBeCloseTo(0.55);
    expect(StarLight.flickerAt(2.14, { pattern: 1, period: 2, delay: 0 })).toBeCloseTo(0.55);
    expect(StarLight.flickerAt(0.38, { pattern: 3, period: 1, delay: 0 })).toBeCloseTo(0.45);
  });

  it('stays within the patterns at any moment', () => {
    for (let second = 0; second < 30; second += 0.37) {
      const value = StarLight.flickerAt(second, { pattern: 2, period: 1.7, delay: 0.4 });

      expect(value).toBeGreaterThanOrEqual(0.5);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
