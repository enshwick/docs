import { AnyString, n } from '@horizon-republic/nominal-types';

import coverageData from '../data/coverage.json' with { type: 'json' };

/** What a mod can do in a game area: see it, change it, add to it, hear it, show it to a player. */
const Capability = AnyString.subtype(
  'docs.Capability',
  n.oneOf('read', 'change', 'create', 'events', 'ui'),
);

/** How far the API reaches one capability of one game area. */
const CoverageStatus = AnyString.subtype(
  'docs.CoverageStatus',
  n.oneOf('covered', 'in-work', 'research', 'not-supported', 'not-applicable'),
);

/** `src/data/coverage.json`: one row per game area and capability, the API names where covered. */
const CoverageRows = n
  .object({
    domain: AnyString,
    capability: Capability,
    status: CoverageStatus,
    items: n.of(AnyString).array().optional(),
    note: n.of(AnyString).optional(),
  })
  .array();

/** One cell of the coverage table, as the page shows it. */
export interface CoverageCell {
  /** One of the `CoverageStatus` values; the page's label key is `coverage.status.<status>`. */
  readonly status: string;
  readonly items: readonly string[];
  readonly note: string | undefined;
}

/** One game area of the coverage table, its cells in the order of `Coverage.capabilities`. */
export interface CoverageDomain {
  readonly name: string;
  readonly cells: readonly CoverageCell[];
}

/**
 * The API coverage page's table: which game areas the API reaches and how, from
 * `src/data/coverage.json`, every area with exactly one cell per capability.
 */
export class Coverage {
  /** The table's columns, in the order the page shows them. */
  public static readonly capabilities = ['read', 'change', 'create', 'events', 'ui'];

  /** The one status whose cell names the API it covers. */
  private static readonly covered = 'covered';

  /** The site's coverage, as `src/data/coverage.json` holds it. */
  public static readonly site = Coverage.from(coverageData);

  private constructor(public readonly domains: readonly CoverageDomain[]) {}

  /**
   * Parses the rows and groups them by game area, in file order.
   *
   * @throws {TypeError} When a row does not parse, an area misses a capability or repeats one, or a
   * covered cell names nothing.
   */
  public static from(data: unknown): Coverage {
    const parsed = CoverageRows.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/coverage.json: ${JSON.stringify(parsed.issues)}`);
    }

    const byDomain = new Map<string, Map<string, CoverageCell>>();

    for (const row of parsed.value) {
      const domain = row.domain.toString();
      const capability = row.capability.toString();
      const cells = byDomain.get(domain) ?? new Map<string, CoverageCell>();
      const cell: CoverageCell = {
        status: row.status.toString(),
        items: (row.items ?? []).map((item) => item.toString()),
        note: row.note?.toString(),
      };

      if (cells.has(capability)) {
        throw new TypeError(`src/data/coverage.json: ${domain} has ${capability} twice`);
      }

      if (cell.status === Coverage.covered && cell.items.length === 0 && cell.note === undefined) {
        throw new TypeError(
          `src/data/coverage.json: ${domain} ${capability} is covered by nothing`,
        );
      }

      cells.set(capability, cell);
      byDomain.set(domain, cells);
    }

    return new Coverage(
      [...byDomain].map(([name, cells]) => ({
        name,
        cells: Coverage.capabilities.map((capability) => {
          const cell = cells.get(capability);

          if (cell === undefined) {
            throw new TypeError(`src/data/coverage.json: ${name} has no ${capability}`);
          }

          return cell;
        }),
      })),
    );
  }
}
