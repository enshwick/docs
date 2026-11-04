/**
 * A page body made fit for MDX, which reads HTML comments, autolinks and braces as code of its
 * own: outside code, comments go, autolinks become links and braces are escaped. The tab
 * components are imported.
 */
export class MdxBody {
  private static readonly fence = /^(\s*)(`{3,}|~{3,})(.*)$/u;
  private static readonly commentOpen = '<!--';
  private static readonly commentClose = '-->';
  private static readonly inlineComment = /<!--.*?-->/gu;
  private static readonly autolink = /<(https?:\/\/[^>\s]+)>/gu;
  private static readonly inlineCode = /(`+)[^`]*?\1/gu;
  private static readonly tabsImport =
    "import { TabItem, Tabs } from '@astrojs/starlight/components';";

  private fence: string | undefined;
  private inComment = false;

  private constructor() {}

  /** The MDX text of `body`. */
  public static of(body: string): string {
    const reader = new MdxBody();
    const lines = body.split('\n').flatMap((line) => reader.line(line));

    return `${MdxBody.tabsImport}\n\n${lines.join('\n')}`;
  }

  /** The line as MDX: unchanged in code, nothing when it held only a comment. */
  private line(line: string): string[] {
    const marker = this.inComment ? null : MdxBody.fence.exec(line);

    if (marker !== null) {
      this.track(marker);

      return [line];
    }

    if (this.fence !== undefined) {
      return [line];
    }

    const text = this.uncommented(line);

    return text.trim() === '' && line.trim() !== '' ? [] : [MdxBody.prose(text)];
  }

  /** Opens a code block at a fence, or closes the open one at its closing fence. */
  private track(marker: RegExpExecArray): void {
    if (this.fence === undefined) {
      this.fence = marker[2] ?? '```';
    } else if ((marker[2] ?? '').startsWith(this.fence) && (marker[3] ?? '').trim() === '') {
      this.fence = undefined;
    }
  }

  /** The line without its comments, which may open on one line and close on a later one. */
  private uncommented(line: string): string {
    let text = line;

    if (this.inComment) {
      const end = text.indexOf(MdxBody.commentClose);

      if (end < 0) {
        return '';
      }

      text = text.slice(end + MdxBody.commentClose.length);
      this.inComment = false;
    }

    text = text.replaceAll(MdxBody.inlineComment, '');

    const open = text.indexOf(MdxBody.commentOpen);

    if (open >= 0) {
      this.inComment = true;

      return text.slice(0, open);
    }

    return text;
  }

  /**
   * A prose line with braces escaped and autolinks as links, outside its inline code.
   * shortcut: inline code spanning lines and a `<` before a word in prose stay as they are; MDX fails the build on them loudly.
   */
  private static prose(text: string): string {
    const parts: string[] = [];
    let at = 0;

    for (const code of text.matchAll(MdxBody.inlineCode)) {
      parts.push(MdxBody.plain(text.slice(at, code.index)), code[0]);
      at = code.index + code[0].length;
    }

    parts.push(MdxBody.plain(text.slice(at)));

    return parts.join('');
  }

  private static plain(text: string): string {
    return text.replaceAll(/[{}]/gu, '\\$&').replaceAll(MdxBody.autolink, '[$1]($1)');
  }
}
