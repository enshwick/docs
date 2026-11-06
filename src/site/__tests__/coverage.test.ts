import { describe, expect, it } from 'vitest';

import { Coverage } from '../coverage.ts';

const area = (domain: string, status = 'in-work'): object[] =>
  Coverage.capabilities.map((capability) => ({ domain, capability, status }));

describe('Coverage', () => {
  it('gives every area of the site one known status per capability, in column order', () => {
    expect(Coverage.site.domains.length).toBeGreaterThan(0);

    for (const domain of Coverage.site.domains) {
      expect(domain.cells).toHaveLength(Coverage.capabilities.length);
    }
  });

  it('refuses a status it does not know', () => {
    const rows = area('Items');

    rows[0] = { domain: 'Items', capability: 'read', status: 'done' };

    expect(() => Coverage.from(rows)).toThrow(TypeError);
  });

  it('refuses an area that misses a capability', () => {
    expect(() => Coverage.from(area('Items').slice(1))).toThrow('Items has no read');
  });

  it('refuses an area that names a capability twice', () => {
    expect(() => Coverage.from([...area('Items'), area('Items')[0]])).toThrow(
      'Items has read twice',
    );
  });

  it('refuses a covered cell that names no API and no note', () => {
    expect(() => Coverage.from(area('Items', 'covered'))).toThrow('covered by nothing');
  });

  it('keeps the areas in file order and the cells in column order', () => {
    const rows = [...area('Loot').toReversed(), ...area('Items')];

    rows[4] = {
      domain: 'Loot',
      capability: 'read',
      status: 'covered',
      items: ['loot::Containers'],
    };

    const coverage = Coverage.from(rows);

    expect(coverage.domains.map((domain) => domain.name)).toEqual(['Loot', 'Items']);
    expect(coverage.domains[0]?.cells[0]).toEqual({
      status: 'covered',
      items: ['loot::Containers'],
      note: undefined,
    });
  });
});
