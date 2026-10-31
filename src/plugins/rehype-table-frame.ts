/** A node of an HTML tree, with only the fields this plugin reads and writes. */
interface HtmlNode {
  readonly type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
}

/**
 * Puts every table in a frame of its own that scrolls sideways, so a wide table never widens the
 * page on a narrow screen. The frame takes keyboard focus, so it can be scrolled without a mouse.
 */
export class TableFrame {
  /** The frame's class, which the stylesheet and the check of the built site both read. */
  public static readonly className = 'ew-table';
  private static readonly table = 'table';
  private static readonly element = 'element';

  /** The rehype plugin: a function that returns the tree transformer. */
  public plugin(): () => (tree: HtmlNode) => void {
    return () => (tree) => {
      this.visit(tree);
    };
  }

  private visit(node: HtmlNode): void {
    const children = node.children ?? [];

    for (const [index, child] of children.entries()) {
      if (TableFrame.isTable(child) && !TableFrame.isFrame(node)) {
        children[index] = TableFrame.frame(child);
        continue;
      }

      this.visit(child);
    }
  }

  private static frame(table: HtmlNode): HtmlNode {
    return {
      type: TableFrame.element,
      tagName: 'div',
      properties: { className: [TableFrame.className], tabIndex: 0 },
      children: [table],
    };
  }

  private static isTable(node: HtmlNode): boolean {
    return node.type === TableFrame.element && node.tagName === TableFrame.table;
  }

  private static isFrame(node: HtmlNode): boolean {
    const className = node.properties?.['className'];

    return Array.isArray(className) && className.includes(TableFrame.className);
  }
}
