import { describe, expect, it } from 'vitest';

import { CodeRules } from '../code-rules.ts';

describe('CodeRules', () => {
  it('refuses a const enum and accepts a native one', () => {
    expect(
      CodeRules.problems('tools/lib/a.ts', 'export const enum Side {\n  Server,\n}\n'),
    ).toEqual(['tools/lib/a.ts:1: use a native enum, not a const enum']);
    expect(CodeRules.problems('tools/lib/a.ts', 'export enum Side {\n  Server,\n}\n')).toEqual([]);
  });

  it('refuses a re-export and accepts an import', () => {
    expect(
      CodeRules.problems('src/site/a.ts', "export { Needs } from './player-page.ts';\n"),
    ).toEqual(['src/site/a.ts:1: import the file that declares it instead of re-exporting it']);
    expect(
      CodeRules.problems('src/site/a.ts', "import { Needs } from './player-page.ts';\n"),
    ).toEqual([]);
  });

  it('refuses a loose exported function, declared or as an arrow', () => {
    const declared = CodeRules.problems('tools/lib/a.ts', 'export function f(): void {}\n');
    const arrow = CodeRules.problems('tools/lib/a.ts', 'export const f = (): void => {};\n');

    expect(declared).toEqual([
      'tools/lib/a.ts:1: put an exported function on its type or as a static method',
    ]);
    expect(arrow).toEqual(declared);
  });

  it('accepts a module-private arrow, a class and a schema constant', () => {
    const text =
      'const f = (): void => {};\nexport class A {}\nexport const schema = n.object({});\n';

    expect(CodeRules.problems('tools/lib/a.ts', text)).toEqual([]);
  });

  it('accepts the handlers Astro reads from a route file, only in a route file', () => {
    const text = 'export const GET: APIRoute = () => Response.json({});\n';

    expect(CodeRules.problems('src/pages/a.json.ts', text)).toEqual([]);
    expect(CodeRules.problems('tools/lib/a.ts', text)).toHaveLength(1);
  });

  it('refuses a suppression without a reason on the line above', () => {
    const bare = 'const a = 1;\n// oxlint-disable-next-line no-console\nconsole.log(a);\n';
    const reasoned =
      'const a = 1;\n// The build log is the output.\n// oxlint-disable-next-line no-console\nconsole.log(a);\n';

    expect(CodeRules.problems('tools/a.ts', bare)).toEqual([
      'tools/a.ts:2: give the suppression its reason on the line above',
    ]);
    expect(CodeRules.problems('tools/a.ts', reasoned)).toEqual([]);
  });

  it('does not take one suppression as the reason for the next', () => {
    const text = '// @ts-expect-error\n// oxlint-disable-next-line no-console\nconsole.log(1);\n';

    expect(CodeRules.problems('tools/a.ts', text)).toHaveLength(2);
  });

  it('refuses a test outside a __tests__ folder', () => {
    expect(CodeRules.problems('tools/lib/a.test.ts', '')).toEqual([
      'tools/lib/a.test.ts:1: a test lives in a __tests__ folder beside the code it tests',
    ]);
    expect(CodeRules.problems('tools/lib/__tests__/a.test.ts', '')).toEqual([]);
  });

  it('holds for every tracked file', async () => {
    const patterns = ['*.ts', '*.mts', '*.astro'];
    const files = (await Bun.$`git ls-files ${patterns}`.quiet().text()).trim().split('\n');

    expect(files.length).toBeGreaterThan(50);

    const problems = await Promise.all(
      files.map(async (file) => CodeRules.problems(file, await Bun.file(file).text())),
    );

    expect(problems.flat()).toEqual([]);
  });
});
