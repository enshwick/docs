import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { OgCard, OgKind } from '../og-card.ts';
import { Repositories } from '../repositories.ts';
import { RepositoryCard } from '../repository-card.ts';

/** The longest description an About box takes, in the widest letters the body face sets. */
const longestDescription = `${'WMWMWMWMW '.repeat(35).slice(0, 349)}W`;
const longestTitle = Object.values(Repositories.site.cards)
  .map((card) => card.title)
  .reduce((longest, title) => (title.length > longest.length ? title : longest));

/** The edges outside the middle 1200x600, as left, top, width and height. */
const edges = [
  { left: 0, top: 0, width: 1280, height: 20 },
  { left: 0, top: 620, width: 1280, height: 20 },
  { left: 0, top: 20, width: 40, height: 600 },
  { left: 1240, top: 20, width: 40, height: 600 },
];

/** The RGBA pixels of each edge of a PNG. */
const edgePixels = (png: Uint8Array): Promise<Buffer[]> =>
  Promise.all(edges.map((edge) => sharp(png).extract(edge).ensureAlpha().raw().toBuffer()));

describe('a repository card', () => {
  it('draws every repository the site lists at the size GitHub asks for', async () => {
    const cards = Object.values(Repositories.site.cards);
    const sizes = await Promise.all(
      cards.map(async (card) => sharp(await new RepositoryCard(card).png()).metadata()),
    );

    expect(sizes.map(({ width, height }) => [width, height])).toEqual(
      cards.map(() => [RepositoryCard.width, RepositoryCard.height]),
    );
  });

  it('fits the longest description an About box takes under the site’s longest title', async () => {
    expect(longestDescription).toHaveLength(350);

    const card = new RepositoryCard({ title: longestTitle, description: longestDescription });

    expect(await card.fits()).toBe(true);
  });

  it('refuses a title too long for the card instead of clipping it', async () => {
    const card = new RepositoryCard({
      title: 'Enshwick mods for Enshrouded '.repeat(6).trim(),
      description: longestDescription,
    });

    expect(await card.fits()).toBe(false);
    await expect(card.png()).rejects.toThrow(RangeError);
  });

  it('draws nothing but the night outside the middle 1200x600 GitHub may crop to', async () => {
    const card = new RepositoryCard({ title: longestTitle, description: longestDescription });
    const [drawn, night] = await Promise.all([
      card.png().then(edgePixels),
      OgCard.night(OgKind.Page, RepositoryCard.width, RepositoryCard.height).then(edgePixels),
    ]);

    expect(drawn).toEqual(night);
  });
});
