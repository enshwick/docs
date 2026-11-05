import type { ReleaseArchives } from '../site/release-archives.ts';

/** A node of a Markdown tree, with only the fields this plugin reads. */
interface MarkdownNode {
  readonly type: string;
  url?: string;
  readonly children?: readonly MarkdownNode[];
}

/**
 * Pins every `releases/latest/download/<archive>` link of a page to the release that carries the
 * archive, through `ReleaseArchives`, so a page names an archive once and always gets the newest.
 */
export class ReleaseLinks {
  private static readonly linkTypes: ReadonlySet<string> = new Set(['link', 'definition']);

  public constructor(private readonly archives: ReleaseArchives) {}

  /** The remark plugin: a function that returns the tree transformer. */
  public plugin(): () => (tree: MarkdownNode) => void {
    return () => (tree) => {
      this.visit(tree);
    };
  }

  private visit(node: MarkdownNode): void {
    if (ReleaseLinks.linkTypes.has(node.type) && node.url !== undefined) {
      node.url = this.archives.pin(node.url);
    }

    for (const child of node.children ?? []) {
      this.visit(child);
    }
  }
}
