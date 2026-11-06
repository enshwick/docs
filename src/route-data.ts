import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

import { Coverage } from './site/coverage.ts';
import { Translations } from './site/translations.ts';

/** Which pages have a translation, read once per build. */
const translations = Translations.fromContent();

/**
 * Keeps fallback pages out of search and out of every page's list of languages, and dates the
 * coverage page by its data, which changes without its page file.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;

  if (context.url.pathname.endsWith(Coverage.page)) {
    route.lastUpdated = new Date(Coverage.site.updated);
  }

  if (context.site !== undefined) {
    route.head = translations.head(route.head, context.url.pathname, context.site.href);
  }
});
