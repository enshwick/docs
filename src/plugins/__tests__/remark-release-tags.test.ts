import { describe, expect, it } from 'vitest';

import { ReleaseTags } from '../remark-release-tags.ts';

const dependency = (tag: string): string =>
  `enshwick = { git = "https://github.com/enshwick/enshwick", tag = "${tag}", features = ["test"] }`;
const install = (tag: string): string =>
  `cargo install --git https://github.com/enshwick/enshwick --tag ${tag} cargo-enshwick`;
const sentence = (tag: string): string =>
  `Install from https://github.com/enshwick/enshwick with --tag ${tag}.`;

describe('ReleaseTags', () => {
  const tags = new ReleaseTags({ 'enshwick/enshwick': 'v1.0.0-alpha.13' });

  it('pins dependency and install lines in code blocks and inline code', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'code', value: `[dependencies]\n${dependency('v1.0.0-alpha.12')}` },
        { type: 'paragraph', children: [{ type: 'inlineCode', value: install('v1.0.0-alpha.9') }] },
      ],
    };

    tags.plugin()()(tree);

    expect(tree.children[0]?.value).toBe(`[dependencies]\n${dependency('v1.0.0-alpha.13')}`);
    expect(tree.children[1]?.children?.[0]?.value).toBe(install('v1.0.0-alpha.13'));
  });

  it('keeps the period of a sentence that ends on the tag', () => {
    expect(tags.pin(sentence('v1.0.0-alpha.12'))).toBe(sentence('v1.0.0-alpha.13'));
  });

  it('leaves placeholders, other repositories and prose alone', () => {
    const lines = [
      dependency('v1.0.0-alpha.N'),
      'serde = { git = "https://github.com/serde-rs/serde", tag = "v1.0.0" }',
      'tag = "v1.0.0-alpha.12" without an address',
    ].join('\n');

    expect(tags.pin(lines)).toBe(lines);
  });

  it('pins every install and dependency line of the AI assistants page', async () => {
    const page = await Bun.file(
      new URL('../../content/docs/ai-assistants.md', import.meta.url),
    ).text();
    const lines = page
      .split('\n')
      .filter((line) => /cargo install .*cargo-enshwick|enshwick = \{/u.test(line));
    const other = new ReleaseTags({ 'enshwick/enshwick': 'v0.0.1' });

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.filter((line) => other.pin(line) === line)).toEqual([]);
  });

  it('refuses data that is not a repository and its tag', () => {
    expect(() => new ReleaseTags({ 'not a repository': 'v1' })).toThrow(/release-tags/u);
  });
});
