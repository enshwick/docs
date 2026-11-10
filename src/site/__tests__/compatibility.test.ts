import { describe, expect, it } from 'vitest';

import { CompatibilityData } from '../compatibility.ts';

const data = (checked: readonly object[]): unknown => ({
  platform: [{ name: 'next', checked }],
  mods: [],
});

describe('CompatibilityData', () => {
  it('takes the newest build of each side with and without its check day', () => {
    const parsed = CompatibilityData.parse(
      data([
        { side: 'client', gameVersion: '1287369', off: [], checked: '2026-11-10' },
        { side: 'server', off: ['bases'] },
      ]),
    );

    expect(parsed.ok).toBe(true);
  });

  it('refuses a build whose features off are not names', () => {
    expect(CompatibilityData.parse(data([{ side: 'server', off: [1] }])).ok).toBe(false);
  });

  it('refuses a build without its features off', () => {
    expect(CompatibilityData.parse(data([{ side: 'server' }])).ok).toBe(false);
  });
});
