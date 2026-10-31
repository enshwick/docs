import { describe, expect, it } from 'vitest';

import { type HeadEntry, Translations } from '../translations.ts';

const site = 'https://enshwick.com';
const translations = Translations.fromFiles([
  'index.mdx',
  'guides/install.mdx',
  'dev/index.md',
  'dev/hooks.md',
  'uk/index.mdx',
  'uk/guides/install.mdx',
]);

/** The head Starlight writes for a page at `path`, with the alternates of both languages. */
const head = (path: string): HeadEntry[] => {
  const own = path.replace(/^\/uk\//u, '/');

  return [
    { tag: 'title', content: 'Page' },
    { tag: 'link', attrs: { rel: 'canonical', href: `${site}${path}` } },
    { tag: 'meta', attrs: { property: 'og:url', content: `${site}${path}` } },
    { tag: 'link', attrs: { rel: 'alternate', hreflang: 'en', href: `${site}${own}` } },
    { tag: 'link', attrs: { rel: 'alternate', hreflang: 'uk', href: `${site}/uk${own}` } },
    { tag: 'link', attrs: { rel: 'alternate', hreflang: 'x-default', href: `${site}${own}` } },
  ];
};

const attr = (entries: readonly HeadEntry[], key: string, value: string, read: string): unknown =>
  entries.find((entry) => entry.attrs?.[key] === value)?.attrs?.[read];

const hreflangs = (entries: readonly HeadEntry[]): unknown[] =>
  entries
    .filter((entry) => entry.attrs?.['rel'] === 'alternate')
    .map((entry) => entry.attrs?.['hreflang']);

describe('Translations', () => {
  it('tells a fallback page from a translated one', () => {
    expect(translations.isFallback('/uk/dev/hooks/')).toBe(true);
    expect(translations.isFallback('/uk/dev/')).toBe(true);
    expect(translations.isFallback('/uk/guides/install/')).toBe(false);
    expect(translations.isFallback('/uk/')).toBe(false);
    expect(translations.isFallback('/dev/hooks/')).toBe(false);
    expect(translations.isFallback('/')).toBe(false);
  });

  it('keeps a translated page indexable, with both languages', () => {
    const entries = translations.head(head('/uk/guides/install/'), '/uk/guides/install/', site);

    expect(attr(entries, 'rel', 'canonical', 'href')).toBe(`${site}/uk/guides/install/`);
    expect(attr(entries, 'name', 'robots', 'content')).toBeUndefined();
    expect(hreflangs(entries)).toEqual(['en', 'uk', 'x-default']);
  });

  it('sends a fallback page to the default language and keeps it out of the index', () => {
    const entries = translations.head(head('/uk/dev/hooks/'), '/uk/dev/hooks/', site);

    expect(attr(entries, 'name', 'robots', 'content')).toBe('noindex');
    expect(attr(entries, 'rel', 'canonical', 'href')).toBe(`${site}/dev/hooks/`);
    expect(attr(entries, 'property', 'og:url', 'content')).toBe(`${site}/dev/hooks/`);
    expect(hreflangs(entries)).toEqual([]);
  });

  it('names no fallback page among the languages of a page', () => {
    const entries = translations.head(head('/dev/hooks/'), '/dev/hooks/', site);

    expect(hreflangs(entries)).toEqual(['en', 'x-default']);
    expect(attr(entries, 'name', 'robots', 'content')).toBeUndefined();
  });

  it('keeps fallback pages out of the sitemap', () => {
    expect(translations.inSitemap(`${site}/uk/dev/hooks/`)).toBe(false);
    expect(translations.inSitemap(`${site}/uk/guides/install/`)).toBe(true);
    expect(translations.inSitemap(`${site}/dev/hooks/`)).toBe(true);
  });
});
