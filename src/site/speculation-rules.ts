/** Links that lead to files rather than pages, which the browser should never prerender. */
const files = ['/og/*', '/*.json', '/*.png', '/*.svg', '/*.zip', '/*.txt', '/*.xml'];

/** The site's own pages: same-origin links that are not files. */
const pages = {
  and: [{ href_matches: '/*' }, ...files.map((file) => ({ not: { href_matches: file } }))],
};

/**
 * The browser's speculation rules for the site: a page a reader is about to open is prerendered
 * when the pointer rests on its link or presses it, so the click shows it at once; browsers that
 * cannot prerender fetch it ahead instead. Astro's own hover prefetch covers browsers without
 * speculation rules.
 */
export const speculationRules = JSON.stringify({
  prerender: [{ source: 'document', where: pages, eagerness: 'moderate' }],
  prefetch: [{ source: 'document', where: pages, eagerness: 'moderate' }],
});
