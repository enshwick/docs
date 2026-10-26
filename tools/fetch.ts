import { mkdir, rm } from 'node:fs/promises';

import sourcesData from '../src/data/sources.json' with { type: 'json' };
import { Sources } from '../src/site/types.ts';
import { DeveloperArea } from './lib/developer-area.ts';
import { PageFile } from './lib/page-file.ts';

// Fills the generated part of the site from its sources before every build: the developer area
// from the platform's book at each version's ref. Generated files are never committed.

const generated = 'src/generated';
const parsed = Sources.parse(sourcesData);

if (!parsed.ok) {
  throw new TypeError(`src/data/sources.json: ${JSON.stringify(parsed.issues)}`);
}

const { platform } = parsed.value;

await rm(`${PageFile.contentRoot}/${DeveloperArea.folder}`, { recursive: true, force: true });
await mkdir(generated, { recursive: true });

const developerSidebar = await new DeveloperArea({
  repository: platform.repository,
  book: platform.book.toString(),
  versions: platform.versions.map((version) => ({
    name: version.name.toString(),
    ref: version.ref,
  })),
  pageTypes: Object.fromEntries(
    Object.entries(platform.pageTypes).map(([path, type]) => [path, type.value]),
  ),
}).build();

await Bun.write(`${generated}/dev-sidebar.json`, `${JSON.stringify(developerSidebar, null, 2)}\n`);
