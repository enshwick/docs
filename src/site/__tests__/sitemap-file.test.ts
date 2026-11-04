import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SitemapFile } from '../sitemap-file.ts';

const index = (...files: string[]): string =>
  `<sitemapindex>${files.map((file) => `<sitemap><loc>https://enshwick.com/${file}</loc></sitemap>`).join('')}</sitemapindex>`;

describe('SitemapFile', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sitemap-file-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('serves the one sitemap itself at sitemap.xml and drops its index', async () => {
    await Bun.write(join(root, 'sitemap-index.xml'), index('sitemap-0.xml'));
    await Bun.write(join(root, 'sitemap-0.xml'), '<urlset/>');

    await SitemapFile.publish(root);

    expect(await readdir(root)).toEqual(['sitemap.xml']);
    expect(await Bun.file(join(root, 'sitemap.xml')).text()).toBe('<urlset/>');
  });

  it('serves the index at sitemap.xml once the pages need several files', async () => {
    await Bun.write(join(root, 'sitemap-index.xml'), index('sitemap-0.xml', 'sitemap-1.xml'));
    await Bun.write(join(root, 'sitemap-0.xml'), '<urlset/>');
    await Bun.write(join(root, 'sitemap-1.xml'), '<urlset/>');

    await SitemapFile.publish(root);

    expect((await readdir(root)).toSorted()).toEqual([
      'sitemap-0.xml',
      'sitemap-1.xml',
      'sitemap.xml',
    ]);
    expect(await Bun.file(join(root, 'sitemap.xml')).text()).toContain('<sitemapindex>');
  });
});
