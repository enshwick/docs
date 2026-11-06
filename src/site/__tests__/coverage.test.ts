import { describe, expect, it } from 'vitest';

import coverageData from '../../data/coverage.json' with { type: 'json' };
import { Coverage } from '../coverage.ts';

const area = (domain: string, status = 'in-work'): Array<Record<string, unknown>> =>
  Coverage.capabilities.map((capability) => ({ domain, capability, status }));
const file = (rows: object[]): object => ({ updated: '2026-11-06', rows });

/** The stability of one covered cell with `module` and `items`, the rest of its area in work. */
const stability = (module: string, items: string[], unstable: string[]): string | undefined => {
  const rows = area('Items');

  rows[0] = { domain: 'Items', capability: 'read', status: 'covered', module, items };

  return Coverage.from(file(rows), unstable).domains[0]?.cells[0]?.stability;
};

describe('Coverage', () => {
  it('reads the site data: every area with one known status per capability, in column order', () => {
    const coverage = Coverage.from(coverageData, []);

    expect(coverage.domains.length).toBeGreaterThan(0);
    expect(coverage.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/u);

    for (const domain of coverage.domains) {
      expect(domain.cells.map((cell) => cell.capability)).toEqual(Coverage.capabilities);
    }
  });

  it('refuses a status it does not know', () => {
    const rows = area('Items');

    rows[0] = { domain: 'Items', capability: 'read', status: 'done' };

    expect(() => Coverage.from(file(rows), [])).toThrow(TypeError);
  });

  it('refuses a date that is not a day', () => {
    expect(() => Coverage.from({ updated: '6 Nov', rows: area('Items') }, [])).toThrow(TypeError);
  });

  it('refuses an area that misses a capability', () => {
    expect(() => Coverage.from(file(area('Items').slice(1)), [])).toThrow('Items has no read');
  });

  it('refuses an area that names a capability twice', () => {
    const again = { domain: 'Items', capability: 'read', status: 'in-work' };

    expect(() => Coverage.from(file([...area('Items'), again]), [])).toThrow(
      'Items has read twice',
    );
  });

  it('refuses a covered cell without a module, or without items and a note', () => {
    const rows = area('Items');

    rows[0] = { domain: 'Items', capability: 'read', status: 'covered', items: ['inventory'] };
    expect(() => Coverage.from(file(rows), [])).toThrow('covered without a module');

    rows[0] = { domain: 'Items', capability: 'read', status: 'covered', module: 'content' };
    expect(() => Coverage.from(file(rows), [])).toThrow('covered without a module');
  });

  it('marks a covered cell unstable by its module, or when every item or item’s module is', () => {
    const unstable = ['world', 'Knowledge::revoke'];

    expect(stability('world', ['World'], unstable)).toBe('unstable');
    expect(stability('inventory', ['world::containers'], unstable)).toBe('unstable');
    expect(stability('content', ['content::items', 'Load::world'], unstable)).toBe('stable');
  });

  it('keeps a cell with one unstable item among stable ones stable, and names that item', () => {
    const rows = area('Knowledge');

    rows[1] = {
      domain: 'Knowledge',
      capability: 'change',
      status: 'covered',
      module: 'knowledge',
      items: ['Knowledge::grant', 'Knowledge::revoke'],
    };

    const cell = Coverage.from(file(rows), ['Knowledge::revoke']).domains[0]?.cells[1];

    expect(cell?.stability).toBe('stable');
    expect(cell?.unstableItems).toEqual(['Knowledge::revoke']);
  });

  it('refuses a covered cell whose module the API crate does not have', () => {
    const rows = area('Items');

    rows[0] = {
      domain: 'Items',
      capability: 'read',
      status: 'covered',
      module: 'messages',
      items: ['x'],
    };

    expect(() => Coverage.from(file(rows), [], ['net', 'content'])).toThrow(
      'names module messages',
    );
  });

  it('counts an area’s covered cells out of those that neither do not apply nor are unsupported', () => {
    const rows = area('Loot');

    rows[0] = {
      domain: 'Loot',
      capability: 'read',
      status: 'covered',
      module: 'loot',
      items: ['x'],
    };
    rows[1] = { domain: 'Loot', capability: 'change', status: 'not-applicable' };
    rows[2] = { domain: 'Loot', capability: 'create', status: 'not-supported' };

    const counts = Coverage.from(file(rows), []).domains.map((domain) =>
      Coverage.count(domain.cells),
    );

    expect(counts).toEqual([{ covered: 1, of: 3 }]);
  });

  it('dates the page by the later of its data and its own file', () => {
    const coverage = Coverage.from(file(area('Items')), []);

    expect(coverage.latest().toISOString()).toBe('2026-11-06T00:00:00.000Z');
    expect(coverage.latest('2026-10-01T00:00:00Z').toISOString()).toBe('2026-11-06T00:00:00.000Z');
    expect(coverage.latest(new Date('2026-12-02T10:00:00Z')).toISOString()).toBe(
      '2026-12-02T10:00:00.000Z',
    );
  });

  it('gives a cell that is not covered no stability', () => {
    expect(Coverage.from(file(area('Items')), ['world']).domains[0]?.cells[0]?.stability).toBe(
      undefined,
    );
  });

  it('keeps the areas in file order, anchors them by name and publishes the same data as JSON', () => {
    const rows = [...area('Loot').toReversed(), ...area('Weather, time and shroud')];

    rows[4] = {
      domain: 'Loot',
      capability: 'read',
      status: 'covered',
      module: 'loot',
      items: ['loot::Containers'],
    };

    const coverage = Coverage.from(file(rows), []);

    expect(coverage.domains.map((domain) => domain.id)).toEqual([
      'loot',
      'weather-time-and-shroud',
    ]);
    const json = coverage.json();

    expect(json).toMatchObject({ updated: '2026-11-06', capabilities: Coverage.capabilities });
    expect(json.domains.map((domain) => domain.name)).toEqual(['Loot', 'Weather, time and shroud']);
    expect(json.domains[0]?.cells.slice(0, 2)).toEqual([
      { capability: 'read', status: 'covered', stability: 'stable', items: ['loot::Containers'] },
      { capability: 'change', status: 'in-work' },
    ]);
  });
});
