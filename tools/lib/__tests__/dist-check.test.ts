import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Languages } from '../../../src/site/languages.ts';
import { Texts } from '../../../src/site/texts.ts';
import type { LanguageCode } from '../../../src/site/types.ts';
import { DistCheck } from '../dist-check.ts';

const site = 'https://enshwick.com';
const described = `<meta name="description" content="${'A sentence &amp; more. '.repeat(7).trim()}"/>`;
const page = (path: string, extra = '', description = described): string =>
  `<html><head><link rel="canonical" href="${site}${path}"/>${description}${extra}<link rel="icon" href="/favicon.svg"/></head></html>`;
/** The description Starlight gives a page that states none. */
const fallback = (language: LanguageCode): string =>
  `<meta name="description" content="${Texts.site.get('site.description', language)}"/>`;
const sitemap = (...paths: string[]): string =>
  `<urlset>${paths.map((path) => `<url><loc>${site}${path}</loc></url>`).join('')}</urlset>`;

describe('DistCheck', () => {
  let root = '';

  const write = async (files: Record<string, string>): Promise<void> => {
    await Promise.all(
      Object.entries(files).map(([path, text]) => Bun.write(join(root, path), text)),
    );
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dist-check-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('passes a clean site', async () => {
    await write({
      'index.html': page('/'),
      'guides/install/index.html': page('/guides/install/'),
      'uk/dev/index.html': page('/dev/', '<meta name="robots" content="noindex"/>'),
      '_astro/site.css': "a { background: url('/circles.svg') }",
      'sitemap.xml': sitemap('/', '/guides/install/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([]);
  });

  it('passes a sitemap index at sitemap.xml and checks the files it lists', async () => {
    await write({
      'index.html': page('/'),
      'sitemap.xml': `<sitemapindex><sitemap><loc>${site}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
      'sitemap-0.xml': sitemap('/', '/gone/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      `sitemap-0.xml: ${site}/gone/ has no page`,
    ]);
  });

  it('finds a sitemap index that lists a sitemap file the build did not write', async () => {
    await write({
      'index.html': page('/'),
      'sitemap.xml': `<sitemapindex><sitemap><loc>${site}/sitemap-0.xml</loc></sitemap><sitemap><loc>${site}/sitemap-1.xml</loc></sitemap></sitemapindex>`,
      'sitemap-0.xml': sitemap('/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      `sitemap.xml: ${site}/sitemap-1.xml names no sitemap file`,
    ]);
  });

  it('finds a sitemap that does not answer at sitemap.xml', async () => {
    await write({ 'index.html': page('/'), 'sitemap-0.xml': sitemap('/') });

    expect(await new DistCheck(root, site).run()).toEqual([`${root}: no sitemap.xml`]);
  });

  it('finds a table that is not in a frame of its own, which would widen the page', async () => {
    await write({
      'index.html': page('/', '<div class="ew-table" tabindex="0"><table></table></div>'),
      'guides/install/index.html': page(
        '/guides/install/',
        '<div class="ew-table" tabindex="0"><table></table></div><table class="x"></table>',
      ),
      'sitemap.xml': sitemap('/', '/guides/install/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      'guides/install/index.html: 1 of 2 tables sit outside a scrolling frame',
    ]);
  });

  it('finds links to the old base, doubled slashes and missing values', async () => {
    await write({
      'index.html': page(
        '/',
        '<link href="/docs/guides/"/><link href="//favicon-small.svg"/><a href="undefined/x/">',
      ),
      '_astro/site.css': "a { background: url('/docs/circles.svg') }",
      'sitemap.xml': sitemap('/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      "index.html: link /docs/guides/ misses the site's root",
      "index.html: link //favicon-small.svg misses the site's root",
      "index.html: link undefined/x/ misses the site's root",
      "_astro/site.css: url /docs/circles.svg misses the site's root",
    ]);
  });

  it('finds a fallback page in the sitemap and a page without its canonical address', async () => {
    await write({
      'index.html': '<html></html>',
      'uk/dev/index.html': page('/dev/', '<meta name="robots" content="noindex"/>'),
      'sitemap.xml': sitemap('/uk/dev/', '/gone/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      `index.html: wants one canonical address on ${site}, has none`,
      'index.html: has no description',
      `sitemap.xml: ${site}/uk/dev/ is a page search must not index`,
      `sitemap.xml: ${site}/gone/ has no page`,
    ]);
  });

  it('finds an indexable page whose description is missing, short or long', async () => {
    await write({
      'index.html': page('/', '', ''),
      'guides/install/index.html': page(
        '/guides/install/',
        '',
        '<meta name="description" content="Short."/>',
      ),
      'guides/remove/index.html': page(
        '/guides/remove/',
        '',
        `<meta name="description" content="${'x'.repeat(161)}"/>`,
      ),
      'uk/guides/index.html': page('/uk/guides/', '<meta name="robots" content="noindex"/>', ''),
      'dev/hooks/index.html': page(
        '/dev/hooks/',
        '',
        '<meta name="description" content="Short."/>',
      ),
      'uk/mods/optimizer/index.html': page(
        '/uk/mods/optimizer/',
        '',
        '<meta name="description" content="Short."/>',
      ),
      'sitemap.xml': sitemap('/guides/install/', '/guides/remove/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      'dev/hooks/index.html: its description has 6 characters, wants 120 to 160',
      'guides/install/index.html: its description has 6 characters, wants 120 to 160',
      'guides/remove/index.html: its description has 161 characters, wants 120 to 160',
      'index.html: has no description',
      'uk/mods/optimizer/index.html: its description has 6 characters, wants 120 to 160',
    ]);
  });

  it("counts a page that falls back to the site's description as missing one, except a home page", async () => {
    const [other = Languages.site.root] = Languages.site.others;

    await write({
      'index.html': page('/', '', fallback(Languages.site.root)),
      [`${other}/index.html`]: page(`/${other}/`, '', fallback(other)),
      [`${other}/guides/install/index.html`]: page(
        `/${other}/guides/install/`,
        '',
        fallback(other),
      ),
      'sitemap.xml': sitemap('/', `/${other}/`, `/${other}/guides/install/`),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      `${other}/guides/install/index.html: has no description`,
    ]);
  });

  it('counts a description by the characters its entities stand for', async () => {
    await write({
      'index.html': page('/', '', `<meta name="description" content="${'&amp;'.repeat(130)}"/>`),
      'sitemap.xml': sitemap('/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([]);
  });

  it('finds a page that answers without the trailing slash', async () => {
    await write({ 'guides/install.html': page('/guides/install/'), 'sitemap.xml': sitemap() });

    expect(await new DistCheck(root, site).run()).toEqual([
      'guides/install.html: a page outside a folder of its own answers without the trailing slash',
    ]);
  });
});
