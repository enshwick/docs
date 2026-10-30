import { describe, expect, it } from 'vitest';

import { PageId } from '../page-id.ts';

describe('PageId', () => {
  it.each(['', 'index', 'uk', 'uk/index'])('knows %j as a front page', (id) => {
    expect(new PageId(id).isFront).toBe(true);
  });

  it.each(['dev', 'dev/index', 'uk/dev', 'guides/install', 'errors/index'])(
    'knows %j as a doc page',
    (id) => {
      expect(new PageId(id).isFront).toBe(false);
    },
  );
});
