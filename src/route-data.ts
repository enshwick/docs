import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

import { SitemapFile } from './site/sitemap-file.ts';
import { Translations } from './site/translations.ts';

/** Which pages have a translation, read once per build. */
const translations = Translations.fromContent();

/**
 * Keeps fallback pages out of search and out of every page's list of languages, and points the
 * sitemap link Starlight adds at the address the sitemap is published on.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;

  if (context.site !== undefined) {
    route.head = translations.head(route.head, context.url.pathname, context.site.href);
  }

  const sitemapLink = route.head.find(
    (entry) => entry.tag === 'link' && entry.attrs?.['rel'] === 'sitemap',
  );

  if (sitemapLink?.attrs !== undefined) {
    sitemapLink.attrs['href'] =
      `${import.meta.env.BASE_URL.replace(/\/?$/u, '/')}${SitemapFile.path}`;
  }
});
