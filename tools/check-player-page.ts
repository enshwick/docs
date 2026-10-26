import { PlayerPageSource } from './lib/player-page-source.ts';

// Checks player pages against the schema the site builds them with:
// `bun tools/check-player-page.ts <mod>/docs/player.md <mod>/docs/player.uk.md ...`.
// Prints each problem and exits with 1 when a page fails.

const files = Bun.argv.slice(2);
const results = await Promise.all(
  files.map(async (file) => {
    try {
      PlayerPageSource.parse(file, await Bun.file(file).text());

      return true;
    } catch (error: unknown) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);

      return false;
    }
  }),
);

const failures = results.filter((ok) => !ok).length;

process.exitCode = failures === 0 && files.length > 0 ? 0 : 1;
