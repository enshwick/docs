import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';
import { topicSchema } from 'starlight-sidebar-topics/schema';

import { modCardSchema } from './site/mod-card.ts';

/** The four kinds of page every developer page declares, and every player page keeps to. */
const pageType = z.enum(['tutorial', 'how-to', 'reference', 'explanation']);

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: topicSchema.extend({
        type: pageType.optional(),
        mod: modCardSchema.optional(),
        error: z.object({ code: z.string() }).optional(),
      }),
    }),
  }),
};
