import { AnyString, n } from '@horizon-republic/nominal-types';

import coverageData from '../data/coverage.json' with { type: 'json' };
// `tools/fetch.ts` writes it too: the public modules of the API crate.
import modulesData from '../generated/api-modules.json' with { type: 'json' };
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
  /**
   * Where covered, `stable` or `unstable`, as the book's stability chapter and the crate have it: a
   * cell is unstable when its module or every item it names is.
   */
  readonly stability: string | undefined;
  readonly items: readonly string[];
  /** The items of a stable cell that still need the `unstable` feature. */
  readonly unstableItems: readonly string[];
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
  /** The statuses an area's count leaves out, as the API coverage measure does. */
  private static readonly uncounted = ['not-supported', 'not-applicable'];
  private static readonly stable = 'stable';
  private static readonly unstable = 'unstable';
  private static readonly pathSeparator = '::';
  private static readonly moduleName = /^[a-z][a-z0-9_]*$/u;
  private static readonly notAnchor = /[^a-z0-9]+/gu;

  /** The site's coverage, as `src/data/coverage.json` holds it. */
  public static readonly site = Coverage.from(coverageData, unstableData, modulesData);

  private constructor(
    /** The day the data was last brought up to date, as `YYYY-MM-DD`. */
    public readonly updated: string,
    public readonly domains: readonly CoverageDomain[],
  ) {}

  /**
   * Parses the rows, groups them by game area in file order, and marks each covered cell stable or
   * unstable by `unstable`: an item is unstable when it or its module is named there, and a cell
   * when its module or every item it names is.
   *
   * @throws {TypeError} When the data does not parse, an area misses a capability or repeats one,
   * or a covered cell names no module, a module not among `modules` where given, or nothing it
   * covers.
   */
  public static from(
    data: unknown,
    unstable: readonly string[],
    modules?: readonly string[],
  ): Coverage {
    const parsed = CoverageFile.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/coverage.json: ${JSON.stringify(parsed.issues)}`);
    }

    const unstableNames = new Set(unstable);
    const known = modules === undefined ? undefined : new Set(modules);
    const byDomain = new Map<string, Map<string, CoverageCell>>();

    for (const row of parsed.value.rows) {
      const domain = row.domain.toString();
      const cell = Coverage.cell(row, unstableNames, known);
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

  /**
   * The page's date: the later of the data's day and `page`, the page file's own date, so an edit
   * to either moves it.
   */
  public latest(page?: Date | string): Date {
    const data = new Date(this.updated);
    const own = page === undefined ? undefined : new Date(page);

    return own !== undefined && own.getTime() > data.getTime() ? own : data;
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
        cells: cells.map(({ capability, status, stability, items, unstableItems, note }) => ({
          capability,
          status,
          ...(stability === undefined ? {} : { stability }),
          ...(items.length === 0 ? {} : { items }),
          ...(unstableItems.length === 0 ? {} : { unstableItems }),
          ...(note === undefined ? {} : { note }),
        })),
      })),
    };
  }

  /**
   * How many of an area's cells are covered, out of those the API could cover: Does not apply and
   * Not supported count in neither.
   */
  public static count(cells: readonly CoverageCell[]): { covered: number; of: number } {
    const counted = cells.filter((cell) => !Coverage.uncounted.includes(cell.status));

    return {
      covered: counted.filter((cell) => cell.status === Coverage.covered).length,
      of: counted.length,
    };
  }

  /** One row as its cell, a covered one stable or unstable by its module and items. */
  private static cell(
    row: CoverageRow,
    unstable: ReadonlySet<string>,
    modules: ReadonlySet<string> | undefined,
  ): CoverageCell {
    const capability = row.capability.toString();
    const status = row.status.toString();
    const items = (row.items ?? []).map((item) => item.toString());
    const note = row.note?.toString();
    const module = row.module?.toString();
    const where = `src/data/coverage.json: ${row.domain.toString()} ${capability}`;

    if (status !== Coverage.covered) {
      return { capability, status, stability: undefined, items, unstableItems: [], note };
    }

    if (module === undefined || (items.length === 0 && note === undefined)) {
      throw new TypeError(`${where} is covered without a module and what covers it`);
    }

    if (modules !== undefined && !modules.has(module)) {
      throw new TypeError(`${where} names module ${module}, which the API crate does not have`);
    }

    const unstableItems = items.filter((item) => Coverage.isUnstable(item, unstable));
    const whole =
      Coverage.isUnstable(module, unstable) ||
      (items.length > 0 && unstableItems.length === items.length);

    return whole
      ? { capability, status, stability: Coverage.unstable, items, unstableItems: [], note }
      : { capability, status, stability: Coverage.stable, items, unstableItems, note };
  }

  /** Whether a module or item is unstable: named so itself, or its module is, as in `world::props`. */
  private static isUnstable(name: string, unstable: ReadonlySet<string>): boolean {
    const [first = ''] = name.split(Coverage.pathSeparator);

    return unstable.has(name) || (Coverage.moduleName.test(first) && unstable.has(first));
  }
}
