import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

import { Translations } from './site/translations.ts';

/** Which pages have a translation, read once per build. */
const translations = Translations.fromContent();

/** Keeps fallback pages out of search and out of every page's list of languages. */
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;

  if (context.site !== undefined) {
    route.head = translations.head(route.head, context.url.pathname, context.site.href);
  }
});
