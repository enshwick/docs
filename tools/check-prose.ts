import { dirname, join } from 'node:path';

import { Languages } from '../src/site/languages.ts';
import { PageFile } from './lib/page-file.ts';
import { PlayerProse } from './lib/player-prose.ts';

// Checks the site's English player pages against the countable player writing rules: words players
// are not told, sentence and paragraph length, and how pictures are given. A page's average
// sentence length and reading grade are printed when above their target, without failing.
// Pages in other languages and the developer pages under /dev/ are left out.

const others = Languages.site.others.map((code) => `${PageFile.contentRoot}/${code}/`);
const developer = /^slug:\s*dev\//mu;
const listed =
  await Bun.$`git ls-files ${`${PageFile.contentRoot}/*.md`} ${`${PageFile.contentRoot}/*.mdx`}`
    .quiet()
    .text();
const files = listed
  .trim()
  .split('\n')
  .filter((file) => file !== '' && !others.some((folder) => file.startsWith(folder)));
const pages = await Promise.all(
  files.map(async (file) => ({ file, text: await Bun.file(file).text() })),
);
let failed = false;

for (const { file, text } of pages.filter((page) => !developer.test(page.text))) {
  const prose = PlayerProse.of(text);

  const size = (path: string): number | undefined => {
    const local = Bun.file(join(dirname(file), path));

    return path.startsWith('/') || path.includes(':') ? undefined : local.size;
  };

  for (const { line, message } of prose.errors) {
    process.stderr.write(`${file}:${line}: ${message}\n`);
    failed = true;
  }

  for (const problem of PlayerProse.media(text, size, PlayerProse.maxPictureBytes)) {
    process.stderr.write(`${file}: ${problem}\n`);
    failed = true;
  }

  for (const warning of prose.warnings) {
    process.stderr.write(`${file}: warning: ${warning}\n`);
  }
}

if (failed) {
  process.exit(1);
}
