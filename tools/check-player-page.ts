import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { PlayerPageSource } from './lib/player-page-source.ts';
import { PlayerProse } from './lib/player-prose.ts';

// Checks player pages against the schema the site builds them with:
// `bun tools/check-player-page.ts <mod>/docs/player.md <mod>/docs/player.uk.md ...`.
// The English page, `player.md`, also keeps the countable player writing rules, and every page's
// pictures their format, alt text and size. Prints each problem and exits with 1 when a page fails.

const english = 'player.md';

const check = async (file: string): Promise<string[]> => {
  const text = await Bun.file(file).text();
  const source = PlayerPageSource.parse(file, text);
  // Bun has no synchronous way to tell a missing file from an empty one.
  const size = (path: string): number | typeof PlayerProse.missing =>
    statSync(join(dirname(file), path), { throwIfNoEntry: false })?.size ?? PlayerProse.missing;
  const screenshots = (source.data.screenshots ?? [])
    .map((shot) => `![${shot.alt.toString()}](${shot.file.toString()})`)
    .join('\n');
  const problems = PlayerProse.media(
    `${text}\n${screenshots}`,
    size,
    PlayerProse.maxPictureBytes,
  ).map((problem) => `${file}: ${problem}`);

  if (basename(file) === english) {
    problems.push(
      ...PlayerProse.of(text).errors.map(({ line, message }) => `${file}:${line}: ${message}`),
    );
  }

  return problems;
};

const files = Bun.argv.slice(2);
const results = await Promise.all(
  files.map(async (file) => {
    try {
      return await check(file);
    } catch (error: unknown) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }),
);
const problems = results.flat();

for (const problem of problems) {
  process.stderr.write(`${problem}\n`);
}

process.exitCode = problems.length === 0 && files.length > 0 ? 0 : 1;
