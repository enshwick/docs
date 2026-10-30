import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

import sourcesData from './data/sources.json' with { type: 'json' };
import { DeveloperVersions } from './site/developer-versions.ts';
import { languages } from './site/languages.ts';
import { texts } from './site/texts.ts';
import { Translations } from './site/translations.ts';
import { LanguageCode } from './site/types.ts';

/** Which pages have a translation, read once per build. */
const translations = Translations.fromContent();

/** The developer area's versions: the newest at `/dev/`, older minors under `/dev/<minor>/`. */
const versions = new DeveloperVersions(sourcesData);

/**
 * Keeps fallback pages out of search and out of every page's list of languages, and marks a page
 * of an older developer minor: `noindex` and a banner that links the newest.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;

  if (context.site !== undefined) {
    route.head = translations.head(route.head, context.url.pathname, context.site.href);
  }

  const older = versions.olderAt(context.url.pathname);

  if (older !== undefined) {
    const parsed = LanguageCode.parse(route.lang);
    const language = parsed.ok ? parsed.value : languages.root;
    const prefix = language.equals(languages.root) ? '' : `/${language}`;
    const base = import.meta.env.BASE_URL.replace(/\/$/u, '');
    const notice = texts.get('dev.older', language).replace('{version}', older);
    const newest = texts.get('dev.newest', language);

    route.head.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex' }, content: '' });
    route.entry.data.banner = {
      content: `${notice} <a href="${base}${prefix}/dev/">${newest}</a>`,
    };
  }
});
