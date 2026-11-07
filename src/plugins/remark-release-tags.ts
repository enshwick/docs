import { n } from '@horizon-republic/nominal-types';

import releaseTagsData from '../generated/release-tags.json' with { type: 'json' };
import { GitRef, RepositoryName } from '../site/types.ts';

/** A node of a Markdown tree, with only the fields this plugin reads. */
interface MarkdownNode {
  readonly type: string;
  value?: string;
  readonly children?: readonly MarkdownNode[];
}

/**
 * Pins the tag of every install and dependency line in a page's code, `--tag v<version>` or
 * `tag = "v<version>"` on a line naming a repository's GitHub address, to that repository's newest
 * release, so a page written for one alpha installs the newest. A placeholder such as
 * `v1.0.0-alpha.N` stays.
 */
export class ReleaseTags {
  private static readonly schema = n.record(RepositoryName, GitRef);
  private static readonly host = 'github.com/';
  /** A tag whose version has a prerelease part, as `v1.0.0-alpha.13`; `enshwick-v1.0.0` has none. */
  private static readonly prereleaseTag = /v\d+\.\d+\.\d+-/u;
  private static readonly codeTypes: ReadonlySet<string> = new Set(['code', 'inlineCode']);
  private static readonly tagged =
    /(--tag |tag = ")v\d+\.\d+\.\d+(?:-[0-9a-z]+(?:\.[0-9a-z]+)*)?(?:\+[0-9a-z]+(?:\.[0-9a-z]+)*)?(?![0-9A-Za-z+-]|\.[0-9A-Za-z])/gu;

  private readonly tags: ReadonlyMap<string, string>;

  /** Takes `src/generated/release-tags.json`, which `tools/fetch.ts` writes before every build. */
  public constructor(data: unknown) {
    const parsed = ReleaseTags.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/generated/release-tags.json: ${JSON.stringify(parsed.issues)}`);
    }

    this.tags = new Map(
      Object.entries(parsed.value).map(([repository, tag]) => [repository, tag.toString()]),
    );
  }

  /** The tags `tools/fetch.ts` picked for this build. */
  public static fromGenerated(): ReleaseTags {
    return new ReleaseTags(releaseTagsData);
  }

  /** Whether the newest release of `repository` is a prerelease, which crates.io and docs.rs never carry. */
  public prerelease(repository: RepositoryName): boolean {
    const tag = this.tags.get(repository.toString());

    return tag !== undefined && ReleaseTags.prereleaseTag.test(tag);
  }

  /** The remark plugin: a function that returns the tree transformer. */
  public plugin(): () => (tree: MarkdownNode) => void {
    return () => (tree) => {
      this.visit(tree);
    };
  }

  /** The code with each tag line of a repository the site reads releases of pinned. */
  public pin(code: string): string {
    return code
      .split('\n')
      .map((line) => {
        const tag = [...this.tags].find(([repository]) =>
          line.includes(`${ReleaseTags.host}${repository}`),
        )?.[1];

        return tag === undefined
          ? line
          : line.replaceAll(ReleaseTags.tagged, (_, prefix: string) => `${prefix}${tag}`);
      })
      .join('\n');
  }

  private visit(node: MarkdownNode): void {
    if (ReleaseTags.codeTypes.has(node.type) && node.value !== undefined) {
      node.value = this.pin(node.value);
    }

    for (const child of node.children ?? []) {
      this.visit(child);
    }
  }
}
