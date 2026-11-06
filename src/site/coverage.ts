import { AnyString, n } from '@horizon-republic/nominal-types';

import coverageData from '../data/coverage.json' with { type: 'json' };
// `tools/fetch.ts` writes it before every build from the book's stability chapter.
import unstableData from '../generated/unstable.json' with { type: 'json' };

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

/** A day as `YYYY-MM-DD`. */
const Day = AnyString.subtype('docs.Day', /^\d{4}-\d{2}-\d{2}$/u);

/**
 * `src/data/coverage.json`: the day it was last brought up to date, and one row per game area and
 * capability; a covered row names the API module that holds it and its items or a note.
 */
const CoverageFile = n.object({
  updated: Day,
  rows: n
    .object({
      domain: AnyString,
      capability: Capability,
      status: CoverageStatus,
      module: n.of(AnyString).optional(),
      items: n.of(AnyString).array().optional(),
      note: n.of(AnyString).optional(),
    })
    .array(),
});

/** One row of `src/data/coverage.json`, parsed. */
type CoverageRow = Extract<
  ReturnType<typeof CoverageFile.parse>,
  { ok: true }
>['value']['rows'][number];

/** One cell of the coverage table, as the page and `/api-coverage.json` show it. */
export interface CoverageCell {
  readonly capability: string;
  /** One of the `CoverageStatus` values; the page's label key is `coverage.status.<status>`. */
  readonly status: string;
  /** Where covered, `stable` or `unstable`, as the book's stability chapter has it. */
  readonly stability: string | undefined;
  readonly items: readonly string[];
  readonly note: string | undefined;
}

/** One game area of the coverage table, its cells in the order of `Coverage.capabilities`. */
export interface CoverageDomain {
  /** The area's anchor on the page, from its name: `weather-time-and-shroud`. */
  readonly id: string;
  readonly name: string;
  readonly cells: readonly CoverageCell[];
}

/**
 * The API coverage page's table: which game areas the API reaches and how, from
 * `src/data/coverage.json`, every area with exactly one cell per capability, each covered cell
 * stable or unstable by the book's stability chapter.
 */
export class Coverage {
  /** The table's columns, in the order the page shows them. */
  public static readonly capabilities = ['read', 'change', 'create', 'events', 'ui'];

  /** The page's address, which also takes its date from the data. */
  public static readonly page = '/dev/api-coverage/';

  /** Where the site publishes the same data as JSON. */
  public static readonly data = '/api-coverage.json';

  /** The status whose cell names the API that covers it. */
  private static readonly covered = 'covered';
  private static readonly stable = 'stable';
  private static readonly unstable = 'unstable';
  private static readonly pathSeparator = '::';
  private static readonly moduleName = /^[a-z][a-z0-9_]*$/u;
  private static readonly notAnchor = /[^a-z0-9]+/gu;

  /** The site's coverage, as `src/data/coverage.json` holds it. */
  public static readonly site = Coverage.from(coverageData, unstableData);

  private constructor(
    /** The day the data was last brought up to date, as `YYYY-MM-DD`. */
    public readonly updated: string,
    public readonly domains: readonly CoverageDomain[],
  ) {}

  /**
   * Parses the rows, groups them by game area in file order, and marks each covered cell unstable
   * when its module, one of its items or an item's module is among `unstable`.
   *
   * @throws {TypeError} When the data does not parse, an area misses a capability or repeats one,
   * or a covered cell names no module or nothing it covers.
   */
  public static from(data: unknown, unstable: readonly string[]): Coverage {
    const parsed = CoverageFile.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/coverage.json: ${JSON.stringify(parsed.issues)}`);
    }

    const unstableNames = new Set(unstable);
    const byDomain = new Map<string, Map<string, CoverageCell>>();

    for (const row of parsed.value.rows) {
      const domain = row.domain.toString();
      const cell = Coverage.cell(row, unstableNames);
      const cells = byDomain.get(domain) ?? new Map<string, CoverageCell>();

      if (cells.has(cell.capability)) {
        throw new TypeError(`src/data/coverage.json: ${domain} has ${cell.capability} twice`);
      }

      cells.set(cell.capability, cell);
      byDomain.set(domain, cells);
    }

    return new Coverage(
      parsed.value.updated.toString(),
      [...byDomain].map(([name, cells]) => ({
        id: name.toLowerCase().replaceAll(Coverage.notAnchor, '-'),
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

  /** The data as `/api-coverage.json` publishes it: the date, the columns and every area. */
  public json(): {
    updated: string;
    capabilities: readonly string[];
    domains: Array<{ name: string; cells: object[] }>;
  } {
    return {
      updated: this.updated,
      capabilities: Coverage.capabilities,
      domains: this.domains.map(({ name, cells }) => ({
        name,
        cells: cells.map(({ capability, status, stability, items, note }) => ({
          capability,
          status,
          ...(stability === undefined ? {} : { stability }),
          ...(items.length === 0 ? {} : { items }),
          ...(note === undefined ? {} : { note }),
        })),
      })),
    };
  }

  /** One row as its cell, a covered one stable or unstable by its module and items. */
  private static cell(row: CoverageRow, unstable: ReadonlySet<string>): CoverageCell {
    const capability = row.capability.toString();
    const status = row.status.toString();
    const items = (row.items ?? []).map((item) => item.toString());
    const note = row.note?.toString();
    const module = row.module?.toString();

    if (status !== Coverage.covered) {
      return { capability, status, stability: undefined, items, note };
    }

    if (module === undefined || (items.length === 0 && note === undefined)) {
      throw new TypeError(
        `src/data/coverage.json: ${row.domain.toString()} ${capability} is covered without a module and what covers it`,
      );
    }

    const stability = [module, ...items].some((name) => Coverage.isUnstable(name, unstable))
      ? Coverage.unstable
      : Coverage.stable;

    return { capability, status, stability, items, note };
  }

  /** Whether a module or item is unstable: named so itself, or its module is, as in `world::props`. */
  private static isUnstable(name: string, unstable: ReadonlySet<string>): boolean {
    const [first = ''] = name.split(Coverage.pathSeparator);

    return unstable.has(name) || (Coverage.moduleName.test(first) && unstable.has(first));
  }
}
