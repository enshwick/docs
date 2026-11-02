import { $ } from 'bun';

// Type-checks the site with TypeScript 7 and the Astro content mapper, after `astro sync` writes
// the content types. `tsc` also checks the `.astro` and `.ts` sources that Starlight and other
// packages ship in node_modules under this site's strictest settings, so their errors are dropped.
// shortcut: drops dependency errors by path, remove once the mapper skips node_modules itself.

await $`bun --bun astro sync`.quiet();

const tsc = await $`bunx tsc --noEmit --pretty false --runExternalCode`.nothrow().quiet();
const output = tsc.stdout.toString();

if (tsc.exitCode !== 0 && !output.includes('error TS')) {
  process.stderr.write(output + tsc.stderr.toString());
  process.exit(tsc.exitCode);
}

const errors = output
  .split(/\n(?=\S)/u)
  .filter((block) => block.includes('error TS') && !block.startsWith('node_modules/'));

for (const error of errors) {
  process.stderr.write(`${error.trimEnd()}\n`);
}

if (errors.length > 0) {
  process.exit(1);
}
