import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GitHistory } from '../git-history.ts';
import { PageFile } from '../page-file.ts';

describe('generated page dates', () => {
  let root = '';

  const git = async (args: readonly string[], date?: string): Promise<void> => {
    const child = Bun.spawn(['git', '-C', root, ...args], {
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
        ...(date === undefined ? {} : { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }),
      },
      stdout: 'ignore',
      stderr: 'inherit',
    });

    expect(await child.exited).toBe(0);
  };

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'page-dates-'));
    await git(['init', '--quiet', '--initial-branch=main']);
    await Bun.write(join(root, 'book/old.md'), '# Old\n');
    await Bun.write(join(root, 'book/new.md'), '# New\n');
    await git(['add', '.']);
    await git(['commit', '--quiet', '--no-gpg-sign', '-m', 'first'], '2026-01-02T03:04:05Z');
    await Bun.write(join(root, 'book/new.md'), '# New, again\n');
    await git(['commit', '--quiet', '--no-gpg-sign', '-am', 'second'], '2026-05-06T07:08:09Z');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('dates a source file by its own last commit, not the newest one', async () => {
    expect(await new GitHistory(root).lastChanged('book/old.md')).toEqual(
      new Date('2026-01-02T03:04:05Z'),
    );
    expect(await new GitHistory(root).lastChanged('book/new.md')).toEqual(
      new Date('2026-05-06T07:08:09Z'),
    );
  });

  it('has no date for a file no commit touched', async () => {
    expect(await new GitHistory(root).lastChanged('book/missing.md')).toBeUndefined();
  });

  it("writes the source's date into the page, and turns the date off without one", () => {
    const dated = new PageFile(
      'dev/old',
      { title: 'Old' },
      'Text',
      new Date('2026-01-02T03:04:05Z'),
    );
    const undated = new PageFile('errors/e1002', { title: 'E1002' }, 'Text', undefined);

    expect(dated.toString()).toContain('\nlastUpdated: 2026-01-02T03:04:05.000Z\n');
    expect(undated.toString()).toContain('\nlastUpdated: false\n');
  });
});
