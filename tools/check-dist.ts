import siteData from '../src/data/site.json' with { type: 'json' };
import { DistCheck } from './lib/dist-check.ts';

// Checks the built site in `dist/` for what search engines see: links that miss the site's root,
// fallback pages in the sitemap, pages without their one canonical address, pages on two paths.
// Run after `bun run build`.

const problems = await new DistCheck('dist', siteData.url).run();

for (const problem of problems) {
  process.stderr.write(`${problem}\n`);
}

if (problems.length > 0) {
  process.exit(1);
}
