import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';

import { OgCard } from '../../site/og-card.ts';

// A social card per page at `/og/<page id>.png`, over the night the hero draws.
const entries = await getCollection('docs');
const backgrounds = await OgCard.backgrounds();

export const { getStaticPaths, GET } = await OGImageRoute({
  pages: Object.fromEntries(entries.map((entry) => [entry.id, entry.data])),
  getImageOptions: (_, page) => new OgCard(page).options(backgrounds),
});
