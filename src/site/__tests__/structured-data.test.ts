import { describe, expect, it } from 'vitest';

import { type SidebarItem, StructuredData } from '../structured-data.ts';

const site = 'https://enshwick.com';
const data = new StructuredData(site);

const sidebar: SidebarItem[] = [
  {
    type: 'group',
    label: 'Start',
    entries: [
      {
        type: 'link',
        label: 'Your first modded game',
        href: '/start/first-modded-game/',
        isCurrent: false,
      },
    ],
  },
  {
    type: 'group',
    label: 'Guides',
    entries: [
      { type: 'link', label: 'Install', href: '/guides/install/', isCurrent: false },
      { type: 'link', label: 'Update', href: '/guides/update/', isCurrent: true },
    ],
  },
];

describe('StructuredData', () => {
  it('describes the project on the home page, with the contact address', () => {
    const graph = data.home('en', '1.0.0-alpha.11');
    const types = graph.map((node) => node['@type']);

    expect(types).toEqual(['Organization', 'WebSite', 'SoftwareApplication']);
    expect(graph[0]).toMatchObject({ url: `${site}/`, email: 'contact@enshwick.com' });
    expect(graph[2]).toMatchObject({
      applicationCategory: 'GameApplication',
      operatingSystem: 'Windows',
      offers: { '@type': 'Offer', price: '0' },
      softwareVersion: '1.0.0-alpha.11',
    });
  });

  it('dates an article only when the page has a real date', () => {
    const page = { path: '/guides/update/', title: 'Update', description: 'How', lang: 'en' };
    const [dated] = data.article(
      { ...page, lastUpdated: new Date('2026-05-06T07:08:09Z') },
      sidebar,
      'Home',
    );
    const [undated] = data.article({ ...page, lastUpdated: undefined }, sidebar, 'Home');

    expect(dated).toMatchObject({
      '@type': 'TechArticle',
      headline: 'Update',
      inLanguage: 'en',
      dateModified: '2026-05-06T07:08:09.000Z',
    });
    expect(undated).not.toHaveProperty('dateModified');
  });

  it('builds the breadcrumbs from the sidebar path, each group linked to its first page', () => {
    const page = {
      path: '/guides/update/',
      title: 'Update',
      description: 'How',
      lang: 'en',
      lastUpdated: undefined,
    };
    const [, crumbs] = data.article(page, sidebar, 'Home');

    expect(crumbs).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Home', item: `${site}/` },
        { position: 2, name: 'Guides', item: `${site}/guides/install/` },
        { position: 3, name: 'Update', item: `${site}/guides/update/` },
      ],
    });
  });

  it('writes JSON that cannot close its script tag', () => {
    expect(StructuredData.script([{ name: '</script>' }])).not.toContain('</script>');
  });
});
