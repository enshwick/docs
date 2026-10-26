import { mkdir, rm } from 'node:fs/promises';

import sourcesData from '../src/data/sources.json' with { type: 'json' };
import { languages } from '../src/site/languages.ts';
import { Sources } from '../src/site/types.ts';
import { DeveloperArea } from './lib/developer-area.ts';
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

await Bun.write(
  `${generated}/compatibility.json`,
  `${JSON.stringify({ platform: developerArea.releases, mods: modReleases }, null, 2)}\n`,
);
await Bun.write(`${generated}/dev-sidebar.json`, `${JSON.stringify(developerSidebar, null, 2)}\n`);
