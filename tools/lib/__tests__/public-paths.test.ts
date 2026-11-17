import { describe, expect, it } from 'vitest';

import { PublicPaths } from '../public-paths.ts';

describe('PublicPaths', () => {
  it('reads every path and those only the unstable feature compiles, past comments and CRLF', () => {
    const text = '# The public paths\r\nworld::World\r\nworld::props unstable\r\nLoad\r\n\r\n';

    expect(PublicPaths.parse(text)).toEqual({
      all: ['Load', 'world::World', 'world::props'],
      unstable: ['world::props'],
    });
  });

  it('refuses a line that is not one path', () => {
    expect(() => PublicPaths.parse('world::World stable\n')).toThrow(TypeError);
    expect(() => PublicPaths.parse(' unstable\n')).toThrow(TypeError);
  });
});
