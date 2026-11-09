import { statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import siteData from '../src/data/site.json' with { type: 'json' };
import { MetaDescription } from './lib/meta-description.ts';
import { PlayerPageSource } from './lib/player-page-source.ts';
import { PlayerProse } from './lib/player-prose.ts';

// Checks player pages against the schema the site builds them with:
// `bun tools/check-player-page.ts <mod>/docs/player.md <mod>/docs/player.uk.md ...`.
// Every page's summary fits a search snippet, its sentences and paragraphs their length, and its
// pictures their format, alt text and size, and no link goes to the site's old address. The English page, `player.md`, also avoids the banned words. Prints each problem and exits with 1 when a page fails.

const english = 'player.md';

const check = async (file: string): Promise<string[]> => {
  const text = await Bun.file(file).text();
  const source = PlayerPageSource.parse(file, text);
  // Bun has no synchronous way to tell a missing file from an empty one.
  const size = (path: string): number | typeof PlayerProse.missing =>
    statSync(join(dirname(file), path), { throwIfNoEntry: false })?.size ?? PlayerProse.missing;
  const screenshots = (source.data.screenshots ?? [])
    .flatMap(({ file: shot, alt, poster }) =>
      (poster === undefined ? [shot] : [shot, poster]).map((path) => `![${alt}](${path})`),
    )
    .join('\n');
  const problems = PlayerProse.media(`${text}\n${screenshots}`, size, PlayerProse.maxPictureBytes)
    .concat(PlayerProse.oldLinks(text, siteData.url))
    .map((problem) => `${file}: ${problem}`);
  const summary = source.data.summary.toString();

  // The summary is also the mod page's meta description.
  if (!MetaDescription.fits(summary)) {
    problems.push(
      `${file}: its summary has ${MetaDescription.lengthOf(summary)} characters; the page description wants ${MetaDescription.shortest} to ${MetaDescription.longest}`,
    );
  }

  const prose = PlayerProse.of(text);
  const findings = basename(file) === english ? prose.errors : prose.limits;

  problems.push(...findings.map(({ line, message }) => `${file}:${line}: ${message}`));

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
