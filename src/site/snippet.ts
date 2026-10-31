/** The languages the front page shows code in, each with the words it marks as keywords. */
export enum SnippetLanguage {
  Rust = 'rust',
  Luau = 'luau',
  Shell = 'shell',
}

/**
 * A short piece of code on the front page, marked for colour without a highlighter: comments,
 * strings, attributes, numbers, keywords and the API's name. The docs' own code blocks use
 * Expressive Code; this is only for the few fixed lines the front page sets by hand.
 */
export class Snippet {
  private static readonly keywords: Record<SnippetLanguage, readonly string[]> = {
    [SnippetLanguage.Rust]: ['fn', 'let', 'mut', 'impl', 'for', 'pub', 'use', 'Self', 'Ok', 'move'],
    [SnippetLanguage.Luau]: ['function', 'local', 'if', 'then', 'end', 'return', 'not'],
    [SnippetLanguage.Shell]: ['cargo'],
  };

  private static readonly api = 'enshwick';

  public constructor(
    private readonly code: string,
    private readonly language: SnippetLanguage,
  ) {}

  /** The code as HTML: escaped, with each marked token in a span of its class. */
  public html(): string {
    const words = Snippet.keywords[this.language].join('|');
    const token = new RegExp(
      [
        '(?<comment>//[^\\n]*|--[^\\n]*)',
        '(?<text>"[^"\\n]*"|`[^`\\n]*`)',
        '(?<attribute>#\\[[^\\]\\n]*\\])',
        '(?<number>\\b\\d+(?:\\.\\d+)?\\b)',
        `(?<keyword>\\b(?:${words})\\b)`,
        `(?<api>\\b${Snippet.api}\\b)`,
      ].join('|'),
      'gu',
    );
    let html = '';
    let at = 0;

    for (const match of this.code.matchAll(token)) {
      const kind = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined)?.[0];

      html += Snippet.escape(this.code.slice(at, match.index));
      html += `<span class="ew-tok-${kind ?? 'text'}">${Snippet.escape(match[0])}</span>`;
      at = match.index + match[0].length;
    }

    return html + Snippet.escape(this.code.slice(at));
  }

  private static escape(text: string): string {
    return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
}
