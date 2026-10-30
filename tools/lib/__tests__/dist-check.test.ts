import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DistCheck } from '../dist-check.ts';

const site = 'https://enshwick.com';
const page = (path: string, extra = ''): string =>
  `<html><head><link rel="canonical" href="${site}${path}"/>${extra}<link rel="icon" href="/favicon.svg"/></head></html>`;
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
      'sitemap-index.xml': '<sitemapindex/>',
      'sitemap-0.xml': sitemap('/', '/guides/install/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([]);
  });

  it('finds links to the old base, doubled slashes and missing values', async () => {
    await write({
      'index.html': page(
        '/',
        '<link href="/docs/guides/"/><link href="//favicon-small.svg"/><a href="undefined/x/">',
      ),
      '_astro/site.css': "a { background: url('/docs/circles.svg') }",
      'sitemap-0.xml': sitemap('/'),
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
      'sitemap-0.xml': sitemap('/uk/dev/', '/gone/'),
    });

    expect(await new DistCheck(root, site).run()).toEqual([
      `index.html: wants one canonical address on ${site}, has none`,
      `sitemap-0.xml: ${site}/uk/dev/ is a page search must not index`,
      `sitemap-0.xml: ${site}/gone/ has no page`,
    ]);
  });

  it('finds a page that answers without the trailing slash', async () => {
    await write({ 'guides/install.html': page('/guides/install/'), 'sitemap-0.xml': sitemap() });

    expect(await new DistCheck(root, site).run()).toEqual([
      'guides/install.html: a page outside a folder of its own answers without the trailing slash',
    ]);
  });
});
