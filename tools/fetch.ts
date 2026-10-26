import { mkdir, rm } from 'node:fs/promises';

import siteData from '../src/data/site.json' with { type: 'json' };
import sourcesData from '../src/data/sources.json' with { type: 'json' };
import { languages } from '../src/site/languages.ts';
import { Sources } from '../src/site/types.ts';
import { ApiMap } from './lib/api-map.ts';
import { DeveloperArea } from './lib/developer-area.ts';
import { IdRule } from './lib/id-rule.ts';
import { ModPages } from './lib/mod-pages.ts';
import { PageFile } from './lib/page-file.ts';

// Fills the generated part of the site from its sources before every build: the developer area
// from the platform's book at each version's ref, the mod pages from each mod's newest release, and
// the data of the compatibility page. Generated files are never committed.

const generated = 'src/generated';
const parsed = Sources.parse(sourcesData);

if (!parsed.ok) {
  throw new TypeError(`src/data/sources.json: ${JSON.stringify(parsed.issues)}`);
}

const { platform, mods } = parsed.value;

const generatedFolders = [
  DeveloperArea.folder,
  ModPages.folder,
  ...languages.others.map((code) => `${code}/${ModPages.folder}`),
];

await Promise.all(
  generatedFolders.map((folder) =>
    rm(`${PageFile.contentRoot}/${folder}`, { recursive: true, force: true }),
  ),
);
await mkdir(generated, { recursive: true });

const developerArea = new DeveloperArea({
  repository: platform.repository,
  book: platform.book.toString(),
  versions: platform.versions.map((version) => ({
    name: version.name.toString(),
    ref: version.ref,
  })),
  pageTypes: Object.fromEntries(
    Object.entries(platform.pageTypes).map(([path, type]) => [path, type.value]),
  ),
});
const [developerSidebar, modReleases] = await Promise.all([
  developerArea.build(),
  new ModPages(mods).build(),
]);

const idRule = IdRule.of(developerArea.releases[0]?.abi ?? '');

if (idRule.examples.length === 0 || idRule.disagreements.length > 0) {
  throw new Error(
    `the site's mod id rules differ from the API crate's: ${idRule.disagreements.join('; ') || 'no examples found in abi.rs'}`,
  );
}

const apiMap = ApiMap.of(developerArea.releases[0]?.lib ?? '', developerArea.newestPages);

if (apiMap.uncovered.length > 0) {
  throw new Error(
    `no developer page names these modules of the API crate: ${apiMap.uncovered.join(', ')}`,
  );
}

await Bun.write(
  `${generated}/api-map.md`,
  `${apiMap.markdown(`${siteData.url}${siteData.base}`)}\n`,
);
await Bun.write(
  `${generated}/compatibility.json`,
  `${JSON.stringify({ platform: developerArea.releases.map(({ lib: _lib, abi: _abi, ...release }) => release), mods: modReleases }, null, 2)}\n`,
);
await Bun.write(`${generated}/dev-sidebar.json`, `${JSON.stringify(developerSidebar, null, 2)}\n`);
