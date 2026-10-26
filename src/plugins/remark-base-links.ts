/** A node of a Markdown tree, with only the fields this plugin reads. */
interface MarkdownNode {
  readonly type: string;
  url?: string;
  readonly children?: readonly MarkdownNode[];
}

/**
 * Puts the site's base path in front of every root-relative link, so pages link as `/install/` and
 * the site can move to another path or domain by its configuration alone.
 */
export class BaseLinks {
  private static readonly linkTypes: ReadonlySet<string> = new Set(['link', 'definition']);

  public constructor(private readonly base: string) {}

  /** The remark plugin: a function that returns the tree transformer. */
  public plugin(): () => (tree: MarkdownNode) => void {
    return () => (tree) => {
      this.visit(tree);
    };
  }

  /** The link with the base in front, or the link itself when it is not root-relative. */
  public rewrite(url: string): string {
    if (!url.startsWith('/') || url.startsWith('//') || url.startsWith(`${this.base}/`)) {
      return url;
    }

    return `${this.base}${url}`;
  }

  private visit(node: MarkdownNode): void {
    if (BaseLinks.linkTypes.has(node.type) && node.url !== undefined) {
      node.url = this.rewrite(node.url);
    }

    for (const child of node.children ?? []) {
      this.visit(child);
    }
  }
}
