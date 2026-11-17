import { describe, expect, it } from 'vitest';

import { GitRef } from '../../../src/site/types.ts';
import { PublicPaths } from '../public-paths.ts';

const main = new GitRef('main');

describe('PublicPaths', () => {
  it('reads every path and those only the unstable feature compiles, past comments and CRLF', () => {
    const text =
      '# The public paths\r\nworld::World\r\nworld::props unstable\r\nLoad\r\nknowledge::Known::r#type\r\n\r\n';

    expect(PublicPaths.parse(text, main)).toEqual({
      all: ['Load', 'knowledge::Known::r#type', 'world::World', 'world::props'],
      unstable: ['world::props'],
    });
  });

  it('refuses a line that is not one path', () => {
    for (const line of ['world::World stable', ' unstable', '=======', 'world::', '::']) {
      expect(() => PublicPaths.parse(`${line}\n`, main)).toThrow(TypeError);
    }
  });

  it('refuses a path listed twice, stable or not', () => {
    expect(() => PublicPaths.parse('world::props\nworld::props unstable\n', main)).toThrow(
      /listed twice: world::props/u,
    );
  });

  it('refuses a ref without the list, naming it', () => {
    expect(() => PublicPaths.parse(undefined, main)).toThrow(
      /main has no tools\/public-paths\.txt/u,
    );
  });
});
