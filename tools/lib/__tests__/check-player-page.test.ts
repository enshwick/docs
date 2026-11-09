import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..', '..');
const script = join(root, 'tools', 'check-player-page.ts');
const workflow = join(root, '.github', 'workflows', 'docs-site.yml');
const summary = 'A'.repeat(130);
const page = (body: string): string =>
  `---\nid: enshwick.area-loot\nname: Area Loot\nsummary: ${summary}\nneeds: server\n---\n\n- Loot for Enshwick.\n\n${body}\n`;

/** The local files a module imports at run time, followed through every import, the module included. */
const runtimeImports = async (file: string, seen = new Set<string>()): Promise<Set<string>> => {
  seen.add(file);

  const text = await Bun.file(file).text();
  const targets = [
    ...text.matchAll(/^import (?!type )[^;]*? from '(\.[^']+)'(?: with \{[^}]*\})?;$/gmu),
  ]
    .map(([, path]) => join(dirname(file), path ?? ''))
    .filter((target) => !seen.has(target));

  await Promise.all(targets.map((target) => runtimeImports(target, seen)));

  return seen;
};

/** The paths the docs workflow's scope step diffs to decide whether the mod pages run. */
const scopedPaths = async (): Promise<string[]> => {
  const text = await Bun.file(workflow).text();
  const scoped = /git diff --quiet "\$BASE\.\.\.HEAD" --\n([^|]*)\|\|/u.exec(text)?.[1] ?? '';

  return scoped.split(/\s+/u).filter((path) => path !== '');
};

describe('check-player-page', () => {
  let folder = '';

  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), 'player-page-'));
  });

  afterAll(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('holds the English page to the banned words and every page to the limits', async () => {
    const english = join(folder, 'player.md');
    const ukrainian = join(folder, 'player.uk.md');

    await Bun.write(english, page('Just open it.'));
    await Bun.write(ukrainian, page('Just одне. Два. Три. Чотири.'));

    const run = Bun.spawnSync(['bun', script, english, ukrainian]);
    const lines = run.stderr.toString().trim().split('\n');

    expect(run.exitCode).toBe(1);
    expect(lines).toEqual([
      `${english}:10: "Just" tells the reader how hard something is`,
      `${ukrainian}:10: a paragraph of 4 sentences; keep it to 3`,
    ]);
  });

  it('is scoped in CI to exactly the files it runs on, so the mods pages run when a rule changes', async () => {
    const paths = await scopedPaths();
    const imports = [...(await runtimeImports(script))].map((file) =>
      relative(root, file).replaceAll('\\', '/'),
    );

    expect(paths.toSorted()).toEqual([...imports, '.github/workflows/docs-site.yml'].toSorted());
  });
});
