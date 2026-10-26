import { existsSync, readFileSync } from 'node:fs';

import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import type { StarlightUserConfig } from '@astrojs/starlight/types';
import { defineConfig } from 'astro/config';
import starlightImageZoom from 'starlight-image-zoom';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightSidebarTopics from 'starlight-sidebar-topics';

import siteData from './src/data/site.json' with { type: 'json' };
import { BaseLinks } from './src/plugins/remark-base-links.ts';
import { languages } from './src/site/languages.ts';
import { texts } from './src/site/texts.ts';

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
  label: texts.get(key),
  translations: texts.translations(key),
  items: [{ autogenerate: { directory } }],
});

const locales = Object.fromEntries(
  languages.all.map(({ code, label, isDefault }) => [
    isDefault ? 'root' : code.toString(),
    { label, lang: code.toString() },
  ]),
);

export default defineConfig({
  site: siteData.url,
  base: siteData.base,
  trailingSlash: 'always',
  markdown: {
    processor: unified({ remarkPlugins: [new BaseLinks(siteData.base).plugin()] }),
  },
  integrations: [
    starlight({
      title: 'enshwick',
      description: texts.get('site.description'),
      logo: {
        dark: './src/assets/mark-on-dark.svg',
        light: './src/assets/mark-on-light.svg',
        alt: 'enshwick',
      },
      favicon: '/favicon.svg',
      head: [
        {
          tag: 'link',
          attrs: { rel: 'icon', href: `${siteData.base}/favicon-small.svg`, sizes: '32x32' },
        },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: `${siteData.base}/apple-touch-icon-180.png` },
        },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600&family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;600&display=swap',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: `${siteData.url}${siteData.base}/social-banner.png`,
          },
        },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
      ],
      customCss: ['./src/styles/brand.css'],
      components: { Head: './src/components/head.astro' },
      defaultLocale: 'root',
      locales,
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/enshwick' }],
      editLink: { baseUrl: `https://github.com/${siteData.repository}/edit/main/` },
      lastUpdated: true,
      plugins: [
        starlightSidebarTopics([
          {
            label: texts.everyLanguage('topic.players'),
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
            label: texts.everyLanguage('topic.developers'),
            link: '/dev/',
            icon: 'seti:rust',
            badge: { text: texts.everyLanguage('badge.developers'), variant: 'note' },
            items: developerSidebar,
          },
        ]),
        starlightImageZoom(),
        starlightLinksValidator({ errorOnLocalLinks: true, errorOnFallbackPages: false }),
        starlightLlmsTxt({
          projectName: 'enshwick',
          description:
            'enshwick is a mod loader and modding API for the game Enshrouded. Mods are Rust crates built against the `enshwick` crate; the loader runs every mod DLL in the `mods/` folder beside the game.',
          ...(apiMap === undefined ? {} : { details: apiMap }),
          customSets: [
            {
              label: 'Mod authors',
              paths: ['dev/**'],
              description: 'the modding guide and API reference for writing mods in Rust',
            },
          ],
        }),
      ],
    }),
  ],
});
