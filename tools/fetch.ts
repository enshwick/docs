import { mkdir, rm } from 'node:fs/promises';

import siteData from '../src/data/site.json' with { type: 'json' };
import sourcesData from '../src/data/sources.json' with { type: 'json' };
import { Languages } from '../src/site/languages.ts';
import { Sources } from '../src/site/types.ts';
import { DeveloperArea } from './lib/developer-area.ts';
import { ErrorPages } from './lib/error-pages.ts';
import { GitHubReleases } from './lib/github-releases.ts';
import { ModPages } from './lib/mod-pages.ts';
import { PageFile } from './lib/page-file.ts';
import { PlatformChecks } from './lib/platform-checks.ts';

// Fills the generated part of the site from its sources before every build: the developer area
// from the platform's book at each version's ref, the mod pages from each mod's release in the mods repository, and
// the data of the compatibility page, and the release each download link points at. Generated files
// are never committed.

const generated = 'src/generated';
/** Astro's content layer cache, under its default `cacheDir`. */
const contentStore = 'node_modules/.astro/data-store.json';
/** The loader's package, which names its archive `enshwick.zip`. */
const loaderPackage = 'enshwick';
const parsed = Sources.parse(sourcesData);

if (!parsed.ok) {
  throw new TypeError(`src/data/sources.json: ${JSON.stringify(parsed.issues)}`);
}

const { platform, mods } = parsed.value;

const generatedFolders = [
  DeveloperArea.folder,
  ErrorPages.folder,
  ModPages.folder,
  ...Languages.site.others.flatMap((code) => [
    `${code}/${ModPages.folder}`,
    `${code}/${ErrorPages.folder}`,
  ]),
];

await Promise.all(
  generatedFolders.map((folder) =>
    rm(`${PageFile.contentRoot}/${folder}`, { recursive: true, force: true }),
  ),
);
await rm(ModPages.publicFolder, { recursive: true, force: true });
// Astro keeps rendered pages while their text and config stay the same, but pinned download links
// change with each release, so every build renders the pages again.
await rm(contentStore, { force: true });
await mkdir(generated, { recursive: true });

const developerArea = new DeveloperArea({
  repository: platform.repository,
  book: platform.book.toString(),
  versions: platform.versions.map((version) => ({
    name: version.name.toString(),
    ref: version.ref,
  })),
});
const developerSidebar = await developerArea.build();
const modReleases = await new ModPages(mods.repository).build();
const loaderTags = GitHubReleases.newestArchives(
  `${platform.repository} releases`,
  await GitHubReleases.list(platform.repository),
  [loaderPackage],
);
const loaderTag = loaderTags.get(loaderPackage);

if (loaderTag === undefined) {
  throw new TypeError(`${platform.repository} has no release with ${loaderPackage}.zip`);
}

const platformChecks = new PlatformChecks(developerArea.releases[0], developerArea.newestPages);
const apiMap = platformChecks.run();

const errors = developerArea.releases[0]?.errors;
const errorPages =
  errors === undefined ? undefined : ErrorPages.parse(DeveloperArea.errorsSource, errors);

await Promise.all(
  (errorPages?.pages(developerArea.releases[0]?.errorsUpdated) ?? []).map((page) => page.write()),
);
const untranslated = errorPages?.missing() ?? [];

if (untranslated.length > 0) {
  // The build log is where a missing translation shows; its page falls back to the root language.
  // oxlint-disable-next-line no-console
  console.warn(`${DeveloperArea.errorsSource} has no text for: ${untranslated.join(', ')}`);
}

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
await Bun.write(
  `${generated}/release-archives.json`,
  `${JSON.stringify(
    {
      [platform.repository.toString()]: { [`${loaderPackage}.zip`]: loaderTag },
      [mods.repository.toString()]: Object.fromEntries(
        modReleases.map((release) => [`${release.package}.zip`, release.tag]),
      ),
    },
    null,
    2,
  )}\n`,
);
