import { describe, expect, it } from 'vitest';

import { type Flicker, Night, type Ridge } from '../night.ts';

/** The ridge line's points, without the two corners that close it along the bottom. */
const linePoints = (ridge: Ridge): Array<{ x: number; y: number }> =>
  Array.from(ridge.path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/gu), ([, x, y]) => ({
    x: Number(x),
    y: Number(y),
  })).slice(0, -2);

const isFlicker = (flicker: Flicker | undefined): flicker is Flicker => flicker !== undefined;

describe('Night', () => {
  it('draws the same svg from the same seed', () => {
    const again = new Night(Night.hero.scene);

    expect(Night.starMarkup(again.stars)).toBe(Night.starMarkup(Night.hero.stars));
    expect(again.ridges).toEqual(Night.hero.ridges);
  });

  it('draws a different sky from another seed', () => {
    const other = Night.stars({ ...Night.hero.scene.field, seed: 12 });

    expect(Night.starMarkup(other)).not.toBe(Night.starMarkup(Night.hero.stars));
  });

  it('gives every star its own breath between 6 and 15 seconds', () => {
    const stars = Night.hero.stars;
    const periods = new Set(stars.map((star) => `${star.breathe}/${star.breatheDelay}`));

    expect(stars).toHaveLength(70);
    expect(periods.size).toBe(stars.length);
    expect(Math.min(...stars.map((star) => star.breathe))).toBeGreaterThanOrEqual(6);
    expect(Math.max(...stars.map((star) => star.breathe))).toBeLessThanOrEqual(15);
  });

  it('lets about half the stars flicker fast, on periods of 1 to 3 seconds', () => {
    const flickers = Night.hero.stars
      .map((star) => star.flicker)
      .filter((flicker) => isFlicker(flicker));
    const periods = flickers.map((flicker) => flicker.period);

    expect(flickers.length).toBeGreaterThan(70 * 0.3);
    expect(flickers.length).toBeLessThan(70 * 0.7);
    expect(new Set(flickers.map((flicker) => flicker.pattern)).size).toBe(3);
    expect(Math.min(...periods)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...periods)).toBeLessThanOrEqual(3);
  });

  it('draws two ridges, each closed along the bottom of the art box', () => {
    const closed = Night.hero.ridges.map((ridge) => ridge.path.endsWith('L1600 900 L0 900 Z'));

    expect(closed).toEqual([true, true]);
  });

  it('raises one main summit well above every other peak of the back ridge', () => {
    const [back] = Night.hero.ridges;
    const away = linePoints(back).filter((point) => Math.abs(point.x - back.summit.x) > 200);
    const nextHighest = Math.min(...away.map((point) => point.y));

    expect(nextHighest - back.summit.y).toBeGreaterThan(40);
  });

  it.each([
    ['hero', Night.hero],
    ['page', Night.page],
  ])('keeps every ridge point of the %s inside its art box', (_, night) => {
    const ys = night.ridges.flatMap((ridge) => linePoints(ridge).map((point) => point.y));

    expect(Math.min(...ys)).toBeGreaterThanOrEqual(night.scene.box.top);
    expect(Math.max(...ys)).toBeLessThanOrEqual(night.scene.box.bottom);
  });
});
