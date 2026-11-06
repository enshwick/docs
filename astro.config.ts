import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import type { StarlightUserConfig } from '@astrojs/starlight/types';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { defineConfig } from 'astro/config';
import starlightGitHubAlerts from 'starlight-github-alerts';
import starlightHeadingBadges from 'starlight-heading-badges';
import starlightImageZoom from 'starlight-image-zoom';
import starlightKbd from 'starlight-kbd';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightSidebarTopics from 'starlight-sidebar-topics';

import siteData from './src/data/site.json' with { type: 'json' };
import releaseArchivesData from './src/generated/release-archives.json' with { type: 'json' };
import { TableFrame } from './src/plugins/rehype-table-frame.ts';
import { BaseLinks } from './src/plugins/remark-base-links.ts';
import { ReleaseLinks } from './src/plugins/remark-release-links.ts';
import { CodeTheme } from './src/site/code-theme.ts';
import { Languages } from './src/site/languages.ts';
import { LastModified } from './src/site/last-modified.ts';
import { ReleaseArchives } from './src/site/release-archives.ts';
import { SitemapFile } from './src/site/sitemap-file.ts';
import { Texts } from './src/site/texts.ts';
import { Translations } from './src/site/translations.ts';

type Sidebar = NonNullable<StarlightUserConfig['sidebar']>;

/** The developer area's sidebar, written by `bun tools/fetch.ts` from the book's summary. */
const developerSidebarFile = new URL('./src/generated/dev-sidebar.json', import.meta.url);
// The file is ours, written by tools/fetch.ts in the shape Starlight takes, and Starlight checks it again.
const developerSidebar: Sidebar = existsSync(developerSidebarFile)
  ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    (JSON.parse(readFileSync(developerSidebarFile, 'utf8')) as Sidebar)
  : [];

/** The API map for `llms.txt`, written by `bun tools/fetch.ts`. */
const apiMapFile = new URL('./src/generated/api-map.md', import.meta.url);
const apiMap = existsSync(apiMapFile) ? readFileSync(apiMapFile, 'utf8') : undefined;

const group = (key: string, directory: string): Sidebar[number] => ({
  label: Texts.site.get(key),
  translations: Texts.site.translations(key),
  items: [{ autogenerate: { directory } }],
});

const locales = Object.fromEntries(
  Languages.site.all.map(({ code, label, isDefault }) => [
    isDefault ? 'root' : code.toString(),
    { label, lang: code.toString() },
  ]),
);

/** Which pages have a translation; `bun tools/fetch.ts` has written the generated ones by now. */
const translations = Translations.fromContent();
const lastModified = LastModified.fromGit();

export default defineConfig({
  site: siteData.url,
  base: siteData.base,
  trailingSlash: 'always',
  // Browsers without speculation rules fetch a page ahead when the pointer rests on its link.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  markdown: {
    processor: unified({
      remarkPlugins: [
        new BaseLinks(siteData.base).plugin(),
        new ReleaseLinks(new ReleaseArchives(releaseArchivesData)).plugin(),
      ],
      rehypePlugins: [new TableFrame().plugin()],
    }),
  },
  integrations: [
    // Starlight adds this one itself when it is missing; it is taken over to keep fallback pages out.
    sitemap({
      filter: (page) => translations.inSitemap(page),
      i18n: {
        defaultLocale: 'root',
        locales: Object.fromEntries(Object.entries(locales).map(([key, { lang }]) => [key, lang])),
      },
      // Pages only: no news, image or video entries.
      namespaces: { news: false, image: false, video: false },
      serialize: (item) => {
        const lastmod = lastModified.of(item.url, siteData.base);
        const fallback = item.links?.find(({ lang }) => lang === Languages.site.root.toString());

        return {
          ...item,
          ...(lastmod === undefined ? {} : { lastmod }),
          // The same `x-default` every page's head names: the root language's page.
          ...(item.links === undefined || fallback === undefined
            ? {}
            : { links: [...item.links, { url: fallback.url, lang: Translations.xDefault }] }),
        };
      },
    }),
    starlight({
      title: 'Enshwick',
      description: Texts.site.get('site.description'),
      logo: { src: './src/assets/brand/lockup.svg', alt: 'Enshwick', replacesTitle: true },
      // Emitted as `shortcut icon`, the fallback for clients that read neither the SVG nor a sized PNG.
      favicon: '/favicon.ico',
      head: [
        // Google wants a raster of 48 px or a multiple; 16 and 32 keep small tab icons sharp.
        ...[16, 32, 48, 96, 192].map((size) => ({
          tag: 'link' as const,
          attrs: {
            rel: 'icon',
            href: `${siteData.base}/favicon-${size}.png`,
            sizes: `${size}x${size}`,
            type: 'image/png',
          },
        })),
        {
          tag: 'link',
          attrs: { rel: 'icon', href: `${siteData.base}/favicon.svg`, type: 'image/svg+xml' },
        },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: `${siteData.base}/apple-touch-icon.png` },
        },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        // Replaces the link Starlight adds, which names `@astrojs/sitemap`'s own file.
        {
          tag: 'link',
          attrs: { rel: 'sitemap', href: `${siteData.base}/${SitemapFile.path}` },
        },
      ],
      routeMiddleware: './src/route-data.ts',
      customCss: [
        './src/styles/brand.css',
        './src/styles/night.css',
        './src/styles/front.css',
        './src/styles/language-select.css',
      ],
      components: {
        Head: './src/components/head.astro',
        Header: './src/components/header.astro',
        PageFrame: './src/components/page-frame.astro',
        Sidebar: './src/components/sidebar.astro',
        MobileMenuFooter: './src/components/mobile-menu-footer.astro',
        PageTitle: './src/components/page-title.astro',
        Footer: './src/components/footer.astro',
        ThemeProvider: './src/components/theme-provider.astro',
        ThemeSelect: './src/components/theme-select.astro',
      },
      expressiveCode: {
        themes: [CodeTheme.night],
        useStarlightUiThemeColors: false,
        plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
        defaultProps: {
          showLineNumbers: false,
          overridesByLang: { 'rust,luau,lua,toml,ts,js': { showLineNumbers: true } },
        },
        styleOverrides: {
          borderRadius: '0',
          borderColor: 'var(--color-line-strong)',
          codeFontFamily: 'var(--font-mono)',
          uiFontFamily: 'var(--font-body)',
          codeFontSize: '0.875rem',
          codeLineHeight: '1.7',
          frames: {
            shadowColor: 'transparent',
            editorActiveTabIndicatorTopColor: 'var(--color-flame)',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
      defaultLocale: 'root',
      locales,
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/enshwick' }],
      editLink: { baseUrl: `https://github.com/${siteData.repository}/edit/main/` },
      lastUpdated: true,
      plugins: [
        starlightKbd({
          globalPicker: false,
          types: [{ id: 'windows', label: 'Windows', default: true }],
        }),
        starlightHeadingBadges(),
        starlightGitHubAlerts(),
        starlightSidebarTopics([
          {
            label: Texts.site.everyLanguage('topic.players'),
            link: '/start/first-modded-game/',
            icon: 'rocket',
            items: [
              group('group.start', 'start'),
              group('group.guides', 'guides'),
              ...(existsSync(new URL('./src/content/docs/mods/', import.meta.url))
                ? [group('group.mods', 'mods')]
                : []),
              group('group.reference', 'reference'),
              ...(existsSync(new URL('./src/content/docs/errors/', import.meta.url))
                ? [group('group.errors', 'errors')]
                : []),
              group('group.explanation', 'explanation'),
            ],
          },
          {
            label: Texts.site.everyLanguage('topic.developers'),
            link: '/dev/',
            icon: 'seti:rust',
            badge: { text: Texts.site.everyLanguage('badge.developers'), variant: 'note' },
            items: [
              ...developerSidebar,
              ...[
                { key: 'group.coverage', link: '/dev/api-coverage/' },
                { key: 'group.aims', link: '/aims/' },
                { key: 'group.ai', link: '/dev/ai-assistants/' },
              ].map(({ key, link }) => ({
                label: Texts.site.get(key),
                translations: Texts.site.translations(key),
                link,
              })),
            ],
          },
        ]),
        starlightImageZoom(),
        starlightLinksValidator({ errorOnLocalLinks: true, errorOnFallbackPages: false }),
        starlightLlmsTxt({
          projectName: 'Enshwick',
          description:
            'Enshwick is the modding framework and API for the game Enshrouded, with a mod loader for PCs and dedicated servers. Mod makers write mods in Rust against the `enshwick` crate, in Luau against the same API by the same names, as data packs without code, or in any language with a C ABI through its C header. Mods offer each other typed services, events and extension points. Players install the loader once, and it runs every mod in the `mods` folder of the game.',
          details: [
            `To write a mod, read [For AI assistants](${siteData.url}${siteData.base}/dev/ai-assistants/) first: the kinds of mod, \`cargo enshwick new\`, the \`unstable\` feature and tests with the fake host. The API reference of the \`enshwick\` crate is on [docs.rs](https://docs.rs/enshwick).`,
            ...(apiMap === undefined ? [] : [apiMap]),
          ].join('\n\n'),
          customSets: [
            {
              label: 'Mod makers',
              paths: ['dev/**'],
              description:
                'the guide for writing mods in Rust, Luau and as data packs, with the notes for AI assistants first and the API coverage by game area',
            },
            {
              label: 'Players',
              paths: [
                'start/**',
                'guides/**',
                'mods/**',
                'reference/**',
                'explanation/**',
                'aims',
                'errors/**',
              ],
              description:
                'how to install, update and remove Enshwick, play on a server, back up worlds, every mod and its settings, where files live and the error codes',
            },
          ],
          optionalLinks: [
            {
              label: 'API reference',
              url: 'https://docs.rs/enshwick',
              description: 'every public item of the `enshwick` crate',
            },
            {
              label: 'Source and examples',
              url: 'https://github.com/enshwick/enshwick',
              description: 'the platform, with Rust, Luau and data pack mods in `examples/`',
            },
          ],
          promote: [
            'index*',
            'dev/ai-assistants',
            'dev',
            'dev/getting-started',
            'dev/concepts*',
            'dev/concepts/**',
          ],
          demote: ['dev/changelog', 'errors/**'],
          exclude: ['dev/changelog'],
          // The "Section titled" links beside each heading are for screen readers on the page, not for models.
          customSelectors: { all: ['.sl-anchor-link'] },
        }),
      ],
    }),
    // After the sitemap integration above has written its files.
    {
      name: 'sitemap-file',
      hooks: { 'astro:build:done': ({ dir }) => SitemapFile.publish(fileURLToPath(dir)) },
    },
  ],
});
