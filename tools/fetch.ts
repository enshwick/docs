import { mkdir, rm } from 'node:fs/promises';

import siteData from '../src/data/site.json' with { type: 'json' };
import sourcesData from '../src/data/sources.json' with { type: 'json' };
import { languages } from '../src/site/languages.ts';
import { Sources } from '../src/site/types.ts';
import { DeveloperArea } from './lib/developer-area.ts';
import { ErrorPages } from './lib/error-pages.ts';
import { ModPages } from './lib/mod-pages.ts';
import { PageFile } from './lib/page-file.ts';
import { PlatformChecks } from './lib/platform-checks.ts';

// Fills the generated part of the site from its sources before every build: the developer area
// from the platform's book at each version's ref, the mod pages from each mod's newest release in the mods repository, and
// the data of the compatibility page. Generated files are never committed.

const generated = 'src/generated';
const parsed = Sources.parse(sourcesData);

if (!parsed.ok) {
  throw new TypeError(`src/data/sources.json: ${JSON.stringify(parsed.issues)}`);
}

const { platform, mods } = parsed.value;

const generatedFolders = [
  DeveloperArea.folder,
  ErrorPages.folder,
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
const developerSidebar = await developerArea.build();
const modReleases = await new ModPages(mods.repository).build();

const platformChecks = new PlatformChecks(developerArea.releases[0], developerArea.newestPages);
const apiMap = platformChecks.run();

const errors = developerArea.releases[0]?.errors;
const errorPages =
  errors === undefined ? undefined : ErrorPages.parse(DeveloperArea.errorsSource, errors);

await Promise.all(
  (errorPages?.pages(developerArea.releases[0]?.errorsUpdated) ?? []).map((page) => page.write()),
);
await Bun.write(
  `${generated}/errors.json`,
  `${JSON.stringify(errorPages?.index() ?? [], null, 2)}\n`,
);

await Bun.write(
  `${generated}/api-map.md`,
  `${apiMap.markdown(`${siteData.url}${siteData.base}`)}\n`,
);
await Bun.write(
  `${generated}/compatibility.json`,
  `${JSON.stringify({ platform: developerArea.releases.map(({ lib: _lib, errors: _errors, errorsUpdated: _errorsUpdated, abi: _abi, ...release }) => release), mods: modReleases }, null, 2)}\n`,
);
await Bun.write(
  `${generated}/stability.json`,
  `${JSON.stringify(apiMap.stability.badges, null, 2)}\n`,
);
await Bun.write(`${generated}/smallest-mod.rs`, `${platformChecks.smallestMod()}\n`);
await Bun.write(`${generated}/dev-sidebar.json`, `${JSON.stringify(developerSidebar, null, 2)}\n`);
