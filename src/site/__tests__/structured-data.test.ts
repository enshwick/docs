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

const homePage = {
  description: 'The modding framework and API for Enshrouded.',
  questions: [{ question: 'Is it free?', answer: 'Yes.' }],
};

describe('StructuredData', () => {
  it('describes the project on the home page, with the contact address', () => {
    const graph = data.home('en', '1.0.0-alpha.11', homePage);
    const types = graph.map((node) => node['@type']);

    expect(types).toEqual(['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage']);
    expect(graph[0]).toMatchObject({
      url: `${site}/`,
      email: 'contact@enshwick.com',
      sameAs: ['https://github.com/enshwick'],
    });
    expect(graph[2]).toMatchObject({
      applicationCategory: 'GameApplication',
      operatingSystem: 'Windows',
      offers: { '@type': 'Offer', price: '0' },
      softwareVersion: '1.0.0-alpha.11',
      description: 'The modding framework and API for Enshrouded.',
      inLanguage: 'en',
    });
  });

  it('states each question the home page answers as a FAQ entry, in its order', () => {
    const questions = [
      { question: 'Is it safe?', answer: 'Our mods are open source.' },
      { question: 'Is it free?', answer: 'Yes.' },
    ];
    const faq = data.home('uk', undefined, { ...homePage, questions }).at(-1);

    expect(faq).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: 'uk',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is it safe?',
          acceptedAnswer: { '@type': 'Answer', text: 'Our mods are open source.' },
        },
        {
          '@type': 'Question',
          name: 'Is it free?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes.' },
        },
      ],
    });
  });

  it('leaves out the FAQ when the home page answers no question', () => {
    const graph = data.home('en', undefined, { ...homePage, questions: [] });

    expect(graph.map((node) => node['@type'])).not.toContain('FAQPage');
    expect(graph[2]).not.toHaveProperty('softwareVersion');
  });

  it('names the site Enshwick at the domain root from every language home page', () => {
    for (const lang of ['en', 'uk']) {
      expect(data.home(lang, '1.0.0', homePage)[1]).toMatchObject({
        '@type': 'WebSite',
        name: 'Enshwick',
        alternateName: ['enshwick', 'enshwick.com'],
        url: `${site}/`,
        inLanguage: lang,
      });
    }
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
