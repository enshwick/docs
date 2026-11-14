import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { CheckedBuilds } from '../checked-builds.ts';

const roots: string[] = [];

/** A checkout of `reports`, each a file name and its text. */
const checkout = async (
  reports: Record<string, string>,
): Promise<Parameters<typeof CheckedBuilds.of>[0]> => {
  const root = await mkdtemp(join(tmpdir(), 'checked-builds-'));

  roots.push(root);
  await mkdir(join(root, CheckedBuilds.reports), { recursive: true });
  await Promise.all(
    Object.entries(reports).map(([file, text]) =>
      Bun.write(join(root, CheckedBuilds.reports, file), text),
    ),
  );

  return {
    path: (relative) => join(root, relative),
    read: (relative) => Bun.file(join(root, relative)).text(),
  };
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('CheckedBuilds.of', () => {
  it('dates each newest build by the day its report records, and leaves one without it undated', async () => {
    const builds = await CheckedBuilds.of(
      await checkout({
        'server-a-1.toml': 'side = "server"\ngame_version = 1\nchecked = "2026-10-01"\n',
        'server-a-2.toml': 'side = "server"\ngame_version = 2\nchecked = "2026-11-14"\n',
        'client-b-1.toml': 'side = "client"\ngame_version = 2\n',
      }),
    );

    expect(builds).toEqual([
      { side: 'client', gameVersion: '2', off: [], checked: undefined },
      { side: 'server', gameVersion: '2', off: [], checked: '2026-11-14' },
    ]);
  });
});
