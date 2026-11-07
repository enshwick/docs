/** A line of a page that installs, depends on or links a platform crate without a pin. */
export interface PinProblem {
  readonly line: number;
  readonly message: string;
}

/**
 * Finds the lines of a page that would send a reader to another version than the platform's
 * newest: an install or dependency line on the platform's git without a tag or commit, and, while
 * the newest release is an alpha, one that takes a crate from crates.io or links its docs.rs pages,
 * which carry only the last crates.io release. The build pins each tagged line to the newest tag.
 */
export class PinRule {
  /** The platform crates a mod maker installs or depends on. */
  private static readonly crates = ['enshwick', 'cargo-enshwick'];
  private static readonly repository = 'github.com/enshwick/enshwick';
  private static readonly install = /\bcargo b?install\s/u;
  private static readonly dependency = new RegExp(
    `(?<![\\w@:./-])(?:${PinRule.crates.join('|')})\\s*=(?!=)\\s*(.*)`,
    'u',
  );
  private static readonly docsRs = new RegExp(
    `docs\\.rs/(?:${PinRule.crates.join('|')})(?![\\w-])`,
    'u',
  );
  private static readonly requirement =
    /^(?:[=^~<>]=?\s*)?\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?$|^\*$/u;
  private static readonly workspace = /(?:^|[\s,{])workspace\s*=\s*true/u;
  private static readonly flags = { git: '--git', tag: '--tag', rev: '--rev', path: '--path' };
  private static readonly keys = {
    git: 'git',
    tag: 'tag',
    rev: 'rev',
    path: 'path',
    version: 'version',
  };
  private static readonly gitMessage = "takes the platform's git without a tag; name its tag";
  private static readonly registryMessage =
    'takes a crate from crates.io, which has no alpha; take it from git at the tag';
  private static readonly docsRsMessage =
    'links docs.rs, which has no alpha; link the source on GitHub';

  private constructor(public readonly problems: readonly PinProblem[]) {}

  /** The problems of `text`; crates.io and docs.rs count as pinned only when `alpha` is false. */
  public static of(text: string, alpha: boolean): PinRule {
    return new PinRule(
      text.split('\n').flatMap((line, index) => {
        const message = PinRule.problem(line, alpha);

        return message === undefined ? [] : [{ line: index + 1, message }];
      }),
    );
  }

  private static problem(line: string, alpha: boolean): string | undefined {
    const pin = PinRule.installPin(line) ?? PinRule.dependencyPin(line);

    if (pin === PinRule.gitMessage) {
      return pin;
    }

    if (!alpha) {
      return undefined;
    }

    return pin ?? (PinRule.docsRs.test(line) ? PinRule.docsRsMessage : undefined);
  }

  private static installPin(line: string): string | undefined {
    if (!PinRule.install.test(line)) {
      return undefined;
    }

    const words = line.split(/\s+/u).map((word) => word.replaceAll('`', ''));
    const namesCrate = words.some((word) =>
      PinRule.crates.some((crate) => word === crate || word.startsWith(`${crate}@`)),
    );

    if (!namesCrate) {
      return undefined;
    }

    const has = (flag: string): boolean =>
      words.some((word) => word === flag || word.startsWith(`${flag}=`));
    const { flags } = PinRule;
    const git = words.findIndex((word) => word === flags.git || word.startsWith(`${flags.git}=`));

    if (git >= 0) {
      const url = words[git]?.split('=')[1] ?? words[git + 1] ?? '';

      if (!url.includes(PinRule.repository)) {
        return undefined;
      }

      return has(flags.tag) || has(flags.rev) ? undefined : PinRule.gitMessage;
    }

    return has(flags.path) ? undefined : PinRule.registryMessage;
  }

  private static dependencyPin(line: string): string | undefined {
    const value = PinRule.dependency.exec(line)?.[1]?.trim();

    if (value === undefined) {
      return undefined;
    }

    if (value.startsWith('"')) {
      const requirement = value.slice(1).split('"')[0] ?? '';

      return PinRule.requirement.test(requirement) ? PinRule.registryMessage : undefined;
    }

    if (!value.startsWith('{')) {
      return undefined;
    }

    const table = value.slice(1).split('}')[0] ?? '';

    const { keys } = PinRule;

    if (PinRule.workspace.test(table) || PinRule.field(table, keys.path) !== undefined) {
      return undefined;
    }

    const git = PinRule.field(table, keys.git);

    if (git !== undefined) {
      if (!git.includes(PinRule.repository)) {
        return undefined;
      }

      const pinned =
        PinRule.field(table, keys.tag) !== undefined ||
        PinRule.field(table, keys.rev) !== undefined;

      return pinned ? undefined : PinRule.gitMessage;
    }

    return PinRule.field(table, keys.version) === undefined ? undefined : PinRule.registryMessage;
  }

  /** The string value of `key` in an inline table. */
  private static field(table: string, key: string): string | undefined {
    return new RegExp(`(?:^|[\\s,])${key}\\s*=\\s*"([^"]*)"`, 'u').exec(table)?.[1];
  }
}
