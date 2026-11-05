import { describe, expect, it } from 'vitest';

import { Languages } from '../../../src/site/languages.ts';
import { Texts } from '../../../src/site/texts.ts';
import { ErrorPages } from '../error-pages.ts';

const source = `
[[error]]
code = "E1002"
title = "Enshwick cannot read the game's files"
cause = "The game does not look like the game Enshwick knows."
fix = "Verify the game files in Steam."

[[error]]
code = "E1008"
title = "Enshwick did not start"
cause = "The game loaded Windows' powrprof.dll."
fix = "Extract Enshwick again."

[[step]]
id = "start"
question = "Does the game start without powrprof.dll?"
yes = "loader-log"
no = "E1002"

[[step]]
id = "loader-log"
question = "Is there a loader.log?"
yes = "E1008"
no = "E1002"
`;

describe('ErrorPages', () => {
  it('writes a page per code in lower case, and the steps as the index', () => {
    const slugs = ErrorPages.parse('test', source)
      .pages()
      .map((page) => page.slug);

    expect(slugs).toEqual(['errors/index', 'errors/e1002', 'errors/e1008']);
  });

  it('links each answer to the next step or to the code it ends in', () => {
    const tree = ErrorPages.parse('test', source).decisionTree();

    expect(tree).toContain('- Yes: [go to question 2](#loader-log)');
    expect(tree).toContain("- No: [E1002: Enshwick cannot read the game's files](/errors/e1002/)");
  });

  it('describes a code page by its code, title, cause and fix, in whole sentences while they fit', () => {
    const page = ErrorPages.parse('test', source)
      .pages()
      .find((found) => found.slug === 'errors/e1002');

    expect(page?.toString()).toContain(
      'description: "E1002: Enshwick cannot read the game\'s files. The game does not look like the game Enshwick knows. Verify the game files in Steam."',
    );
  });

  it('adds no period after a title that already ends a sentence', () => {
    const asked = source.replace("Enshwick cannot read the game's files", 'Is the game updated?');
    const page = ErrorPages.parse('test', asked)
      .pages()
      .find((found) => found.slug === 'errors/e1002');

    expect(page?.toString()).toContain('description: "E1002: Is the game updated? The game');
  });

  it('lists every code with its page, cause and fix for the JSON index', () => {
    expect(ErrorPages.parse('test', source).index()).toEqual([
      {
        code: 'E1002',
        title: "Enshwick cannot read the game's files",
        cause: 'The game does not look like the game Enshwick knows.',
        fix: 'Verify the game files in Steam.',
        page: '/errors/e1002/',
      },
      {
        code: 'E1008',
        title: 'Enshwick did not start',
        cause: "The game loaded Windows' powrprof.dll.",
        fix: 'Extract Enshwick again.',
        page: '/errors/e1008/',
      },
    ]);
  });

  describe('in another language', () => {
    const [other] = Languages.site.others;

    if (other === undefined) {
      return;
    }

    // E1002 and both steps carry the other language; E1008 does not.
    const translated = source
      .replace(
        'fix = "Verify the game files in Steam."',
        `fix = "Verify the game files in Steam."\n\n[error.translations.${other}]\ntitle = "t-1002"\ncause = "c-1002"\nfix = "f-1002"`,
      )
      .replace(
        'no = "E1002"\n\n[[step]]',
        `no = "E1002"\n\n[step.translations.${other}]\nquestion = "q-start?"\n\n[[step]]`,
      )
      .concat(`\n[step.translations.${other}]\nquestion = "q-log?"\n`);

    it('writes the pages it translates under the language, and no page for the rest', () => {
      const pages = ErrorPages.parse('test', translated).pages();

      expect(pages.map((page) => page.slug)).toEqual([
        'errors/index',
        'errors/e1002',
        'errors/e1008',
        `${other}/errors/index`,
        `${other}/errors/e1002`,
      ]);
      expect(pages.at(-1)?.toString()).toContain(
        `## ${Texts.site.get('error.why', other)}\n\nc-1002\n\n## ${Texts.site.get('error.fix', other)}\n\nf-1002`,
      );
    });

    it('asks the questions in the language and links into its pages', () => {
      const tree = ErrorPages.parse('test', translated).decisionTree(other);
      const no = Texts.site.get('errors.no', other);

      expect(tree).toContain('## 1. q-start?');
      expect(tree).toContain(`- ${no}: [E1002: t-1002](/${other}/errors/e1002/)`);
      expect(tree).toContain(`[E1008: Enshwick did not start](/${other}/errors/e1008/)`);
    });

    it('writes no index in the language while a step lacks it', () => {
      const slugs = ErrorPages.parse(
        'test',
        translated.replace(`[step.translations.${other}]\nquestion = "q-log?"\n`, ''),
      )
        .pages()
        .map((page) => page.slug);

      expect(slugs).not.toContain(`${other}/errors/index`);
    });

    it('names each code and step without its text in the language', () => {
      expect(ErrorPages.parse('test', translated).missing()).toEqual([`E1008 ${other}`]);
      expect(ErrorPages.parse('test', source).missing()).toEqual([
        `E1002 ${other}`,
        `E1008 ${other}`,
        `start ${other}`,
        `loader-log ${other}`,
      ]);
    });
  });

  it('shows a placeholder such as <save> in a text as text, not as an HTML tag', () => {
    const placeholders = source
      .replace('Extract Enshwick again.', 'Delete <save>-mod-settings & retry.')
      .replace('Is there a loader.log?', 'Is there a logs/enshwick_<date>.log?');
    const pages = ErrorPages.parse('test', placeholders).pages();

    expect(pages.find((page) => page.slug === 'errors/e1008')?.toString()).toContain(
      'Delete &lt;save&gt;-mod-settings &amp; retry.',
    );
    expect(pages[0]?.toString()).toContain('## 2. Is there a logs/enshwick_&lt;date&gt;.log?');
  });

  it('refuses a code that is not E and four digits', () => {
    expect(() => ErrorPages.parse('test', source.replace('"E1008"', '"X8"'))).toThrow(/test/u);
  });
});
