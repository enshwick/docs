import { statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Languages } from '../src/site/languages.ts';
import { PageFile } from './lib/page-file.ts';
import { PlayerProse } from './lib/player-prose.ts';

// Checks the site's player pages: the pictures of every page in every language, and the English
// pages against the countable player writing rules (words players are not told, sentence and
// paragraph length). A page's average sentence length and reading grade are printed when above
// their target, without failing. The developer pages under /dev/ are left out.

const others = Languages.site.others.map((code) => `${PageFile.contentRoot}/${code}/`);
const developer = /^slug:\s*dev\//mu;
const offSite = /^(?:[a-z]+:|\/\/)/u;
const publicRoot = 'public';
const patterns = [`${PageFile.contentRoot}/*.md`, `${PageFile.contentRoot}/*.mdx`];
const listed = await Bun.$`git ls-files ${patterns}`.quiet().text();
const files = listed
  .trim()
  .split('\n')
  .filter((file) => file !== '');
const pages = await Promise.all(
  files.map(async (file) => ({ file, text: await Bun.file(file).text() })),
);

/** A picture's bytes: a root path from `public/`, any other from beside the page. */
const size = (page: string, path: string): number | typeof PlayerProse.missing | undefined => {
  if (offSite.test(path)) {
    return undefined;
  }

  const local = path.startsWith('/') ? join(publicRoot, path) : join(dirname(page), path);

  // Bun has no synchronous way to tell a missing file from an empty one.
  return statSync(local, { throwIfNoEntry: false })?.size ?? PlayerProse.missing;
};

let failed = false;

for (const { file, text } of pages.filter((page) => !developer.test(page.text))) {
  for (const problem of PlayerProse.media(
    text,
    (path) => size(file, path),
    PlayerProse.maxPictureBytes,
  )) {
    process.stderr.write(`${file}: ${problem}\n`);
    failed = true;
  }

  if (others.some((folder) => file.startsWith(folder))) {
    continue;
  }

  const prose = PlayerProse.of(text);

  for (const { line, message } of prose.errors) {
    process.stderr.write(`${file}:${line}: ${message}\n`);
    failed = true;
  }

  for (const warning of prose.warnings) {
    process.stderr.write(`${file}: warning: ${warning}\n`);
  }
}

if (failed) {
  process.exit(1);
}
