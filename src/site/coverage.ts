import { AnyString, n } from '@horizon-republic/nominal-types';

import coverageData from '../data/coverage.json' with { type: 'json' };
// `tools/fetch.ts` writes it too: every public path of the API crate, as the platform lists them.
import itemsData from '../generated/api-items.json' with { type: 'json' };
// `tools/fetch.ts` writes it too: the public modules of the API crate.
import modulesData from '../generated/api-modules.json' with { type: 'json' };
// `tools/fetch.ts` writes it too: the public paths only the API crate's `unstable` feature compiles.
import gatedData from '../generated/api-unstable.json' with { type: 'json' };
import { ApiSurface } from './api-surface.ts';

/** What a mod can do in a game area: see it, change it, add to it, hear it, show it to a player. */
const Capability = AnyString.subtype(
  'docs.Capability',
  n.oneOf('read', 'change', 'create', 'events', 'ui'),
);

/** How far the API reaches one capability of one game area. */
const CoverageStatus = AnyString.subtype(
  'docs.CoverageStatus',
  n.oneOf('covered', 'in-work', 'research', 'planned', 'not-supported', 'not-applicable'),
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

/** `src/data/coverage.json`, parsed. */
type CoverageValue = Extract<ReturnType<typeof CoverageFile.parse>, { ok: true }>['value'];

/** One row of `src/data/coverage.json`, parsed. */
type CoverageRow = CoverageValue['rows'][number];

/** One cell of the coverage table, as the page and `/api-coverage.json` show it. */
export interface CoverageCell {
  readonly capability: string;
  /** One of the `CoverageStatus` values; the page's label key is `coverage.status.<status>`. */
  readonly status: string;
  /**
   * Where covered, `stable` or `unstable`, as the crate gates it: a
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
  /**
   * Whether the area is planned after 1.0, outside the table 1.0 aims to cover in full: it has a
   * cell planned after 1.0.
   */
  readonly later: boolean;
  readonly cells: readonly CoverageCell[];
}

/**
 * The API coverage page's table: which game areas the API reaches and how, from
 * `src/data/coverage.json`, every area with exactly one cell per capability, each covered cell
 * stable or unstable by the crate's `unstable` feature.
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
  /** The status that puts a cell, and with it its area, after 1.0. */
  private static readonly planned = 'planned';
  /** The statuses an area's count leaves out, as the API coverage measure does. */
  private static readonly uncounted = ['not-supported', 'not-applicable'];
  private static readonly stable = 'stable';
  private static readonly unstable = 'unstable';
  private static readonly notAnchor = /[^a-z0-9]+/gu;
  private static readonly anchorEdge = /^-+|-+$/gu;

  /** The site's coverage, as `src/data/coverage.json` holds it. */
  public static readonly site = Coverage.from(
    coverageData,
    gatedData,
    new ApiSurface(modulesData, itemsData),
  );

  /** The areas for 1.0, in file order. */
  public readonly forOne: readonly CoverageDomain[];

  /** The areas planned after 1.0, in file order. */
  public readonly afterOne: readonly CoverageDomain[];

  private constructor(
    /** The day the data was last brought up to date, as `YYYY-MM-DD`. */
    public readonly updated: string,
    public readonly domains: readonly CoverageDomain[],
  ) {
    this.forOne = domains.filter((domain) => !domain.later);
    this.afterOne = domains.filter((domain) => domain.later);
  }

  /**
   * Parses the rows, groups them by game area in file order, and marks each covered cell stable or
   * unstable by `unstable`, the crate paths only the `unstable` feature compiles: an item is unstable
   * when its path is there, and a cell when its module or every item it names is.
   *
   * @throws {TypeError} When the data does not parse, an area misses a capability or repeats one,
   * or a covered cell names no module, nothing it covers, or, where `api` is given, a module or an
   * item the API crate lacks.
   */
  public static from(data: unknown, unstable: readonly string[], api?: ApiSurface): Coverage {
    const parsed = CoverageFile.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/coverage.json: ${JSON.stringify(parsed.issues)}`);
    }

    const unstableNames: ReadonlySet<string> = new Set(unstable);
    const byDomain = new Map<string, Map<string, CoverageCell>>();

    for (const row of parsed.value.rows) {
      const domain = row.domain.toString();
      const cell = Coverage.cell(row, unstableNames, api);
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
        id: name
          .toLowerCase()
          .replaceAll(Coverage.notAnchor, '-')
          .replaceAll(Coverage.anchorEdge, ''),
        name,
        later: [...cells.values()].some((cell) => cell.status === Coverage.planned),
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
    domains: Array<{ name: string; later?: true; cells: object[] }>;
  } {
    return {
      updated: this.updated,
      capabilities: Coverage.capabilities,
      domains: this.domains.map(({ name, later, cells }) => ({
        name,
        ...(later ? { later } : {}),
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

  /** How many cells of `domains` are covered, out of those counted, as `count` counts one area. */
  public static total(domains: readonly CoverageDomain[]): { covered: number; of: number } {
    return Coverage.count(domains.flatMap((domain) => domain.cells));
  }

  /** The covered share of a count as a whole percentage, or `undefined` when it counts nothing. */
  public static percent({ covered, of }: { covered: number; of: number }): number | undefined {
    return of === 0 ? undefined : Math.round((covered * 100) / of);
  }

  /**
   * One row as its cell, a covered one with each item as the crate path `api` reads it at, stable
   * or unstable by its module and those paths.
   */
  private static cell(
    row: CoverageRow,
    unstable: ReadonlySet<string>,
    api: ApiSurface | undefined,
  ): CoverageCell {
    const capability = row.capability.toString();
    const status = row.status.toString();
    const written = (row.items ?? []).map((item) => item.toString());
    const note = row.note?.toString();
    const module = row.module?.toString();
    const where = `src/data/coverage.json: ${row.domain.toString()} ${capability}`;

    if (status !== Coverage.covered) {
      return { capability, status, stability: undefined, items: written, unstableItems: [], note };
    }

    if (module === undefined || (written.length === 0 && note === undefined)) {
      throw new TypeError(`${where} is covered without a module and what covers it`);
    }

    if (api !== undefined && !api.hasModule(module)) {
      throw new TypeError(`${where} names module ${module}, which the API crate does not have`);
    }

    const items = written.map((item) => {
      const path = api === undefined ? item : api.pathOf(module, item);

      if (path === undefined) {
        throw new TypeError(`${where} names item ${item}, which the API crate does not have`);
      }

      return path;
    });
    const unstableItems = items.filter((item) => unstable.has(item));
    const whole =
      unstable.has(module) || (items.length > 0 && unstableItems.length === items.length);

    return whole
      ? { capability, status, stability: Coverage.unstable, items, unstableItems: [], note }
      : { capability, status, stability: Coverage.stable, items, unstableItems, note };
  }
}
