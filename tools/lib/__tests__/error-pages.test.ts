import { describe, expect, it } from 'vitest';

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

  it('refuses a code that is not E and four digits', () => {
    expect(() => ErrorPages.parse('test', source.replace('"E1008"', '"X8"'))).toThrow(/test/u);
  });
});
