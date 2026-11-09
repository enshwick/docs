import { describe, expect, it } from 'vitest';

import { Languages } from '../../../src/site/languages.ts';
import { Texts } from '../../../src/site/texts.ts';
import { PlayerProse } from '../player-prose.ts';

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ');

describe('PlayerProse', () => {
  it('refuses a word that tells the reader how hard something is', () => {
    expect(PlayerProse.of('Just open the menu.\n').errors).toEqual([
      { line: 1, message: '"Just" tells the reader how hard something is' },
    ]);
  });

  it('leaves above and below to review', () => {
    expect(PlayerProse.of('The reason shows above the list.\n').errors).toEqual([]);
  });

  it('refuses a sentence over 25 words and accepts one of 25', () => {
    expect(PlayerProse.of(`${words(25)}.\n`).errors).toEqual([]);
    expect(PlayerProse.of(`${words(26)}.\n`).errors).toHaveLength(1);
  });

  it('refuses a paragraph of four sentences and accepts three', () => {
    expect(PlayerProse.of('One. Two. Three.\n').errors).toEqual([]);
    expect(PlayerProse.of('One. Two. Three.\nFour.\n').errors).toEqual([
      { line: 1, message: 'a paragraph of 4 sentences; keep it to 3' },
    ]);
  });

  it('holds a Ukrainian page to the sentence and paragraph limits but not the English words', () => {
    const page = '---\ntitle: Моди\n---\n\nОдне. Два. Три. Чотири.\n\nJust три слова.\n';

    expect(PlayerProse.of(page).limits).toEqual([
      { line: 5, message: 'a paragraph of 4 sentences; keep it to 3' },
    ]);
    expect(PlayerProse.of(`Одне ${words(25)}.\n`).limits).toHaveLength(1);
  });

  it('reads a site text as one paragraph, even one that opens like markup', () => {
    expect(PlayerProse.ofText('One. Два. Three.').errors).toEqual([]);
    expect(PlayerProse.ofText('- One. Два. Three. Чотири.').errors).toEqual([
      { line: 1, message: 'a paragraph of 4 sentences; keep it to 3' },
    ]);
    expect(PlayerProse.ofText(`Одне ${words(25)}.`).errors).toHaveLength(1);
    expect(PlayerProse.of('# One. Two. Three. Four.').errors).toEqual([]);
    expect(PlayerProse.ofText('# One. Two. Three. Four.').errors).toEqual([
      { line: 1, message: 'a paragraph of 4 sentences; keep it to 3' },
    ]);
  });

  it('checks every text in each language that has its own, and only those', () => {
    const languages = new Languages([
      { code: 'en', label: 'English', default: true },
      { code: 'uk', label: 'Українська' },
    ]);
    const texts = new Texts(
      {
        'a.short': { en: 'One.', uk: 'Одне. Два. Три. Чотири.' },
        'b.root': { en: 'One. Two. Three. Four.' },
        'c.words': { en: 'Just one.', uk: 'Just одне.' },
      },
      languages,
    );

    expect(PlayerProse.ofTexts(texts, languages)).toEqual([
      'a.short (uk): a paragraph of 4 sentences; keep it to 3',
      'b.root (en): a paragraph of 4 sentences; keep it to 3',
      'c.words (en): "Just" tells the reader how hard something is',
    ]);
  });

  it('counts each list item as its own paragraph, wrapped lines included', () => {
    const list = '- One. Two.\n  Three.\n- Four. Five.\n';

    expect(PlayerProse.of(list).errors).toEqual([]);
  });

  it('skips front matter, code, tables, headings and components, and keeps line numbers', () => {
    const page = `---\ntitle: A\n---\n\n## Heading. Two. Three. Four.\n\n\`\`\`bash\n${words(40)}.\n\`\`\`\n\n| ${words(30)} |\n<Steps>\n\nJust one.\n`;

    expect(PlayerProse.of(page).errors).toEqual([
      { line: 14, message: '"Just" tells the reader how hard something is' },
    ]);
  });

  it('skips front matter with Windows line endings', () => {
    const page = `---\r\ntitle: A\r\ndescription: ${words(30)}.\r\n---\r\n\r\nJust one.\r\n`;

    expect(PlayerProse.of(page).errors).toEqual([
      { line: 6, message: '"Just" tells the reader how hard something is' },
    ]);
  });

  it('reads link text and code spans as words', () => {
    const prose = PlayerProse.of(
      'Open [the settings guide](/guides/change-mod-settings/) and set `count.bases`.\n',
    );

    expect(prose.averageWords).toBe(7);
  });

  it('warns on a long average or a high grade without failing', () => {
    const page = `${words(20)}.\n\nIndustrialization internationalization institutionalization characterization.\n`;
    const prose = PlayerProse.of(page);

    expect(prose.errors).toEqual([]);
    expect(prose.warnings).toHaveLength(1);
  });

  it('does not end a sentence after e.g., i.e., etc. or vs.', () => {
    const prose = PlayerProse.of(
      'Use a launcher, e.g. Steam. Keep one copy, i.e. Your own, etc. Then compare mods vs. Packs.\n',
    );

    expect(prose.errors).toEqual([]);
  });

  it('warns on a long average without the English grade', () => {
    const prose = PlayerProse.of(
      `Одне ${words(15)} internationalization institutionalization characterization.\n`,
    );

    expect(prose.lengthWarnings).toEqual(['sentences average 19.0 words; the target is 15']);
    expect(prose.warnings).toHaveLength(2);
  });

  it('ends a sentence before one that opens with a code span', () => {
    expect(
      PlayerProse.of('Open the folder. `powrprof.dll` loads first. Then play.\n').errors,
    ).toEqual([]);
    expect(
      PlayerProse.of('Open the folder. `powrprof.dll` loads first. Then play. Done.\n').errors,
    ).toEqual([{ line: 1, message: 'a paragraph of 4 sentences; keep it to 3' }]);
  });

  it('ends a sentence after a closing quote or bracket', () => {
    const quoted = PlayerProse.of('Click "Save." Then wait. Then play. Done.\n').errors;
    const bracketed = PlayerProse.of(
      'Read it (the install guide.) Then wait. Then play. Done.\n',
    ).errors;

    expect(quoted).toEqual([{ line: 1, message: 'a paragraph of 4 sentences; keep it to 3' }]);
    expect(bracketed).toEqual(quoted);
  });

  it('refuses a GIF, another still format, a missing alt text, a missing file and a large picture', () => {
    const sizes: Partial<Record<string, number | typeof PlayerProse.missing>> = {
      'loop.gif': PlayerProse.missing,
      'shot.png': PlayerProse.missing,
      'a.webp': 300 * 1024,
      'b.avif': 1024,
      'gone.webp': PlayerProse.missing,
    };
    const page =
      '![](loop.gif)\n![The menu](shot.png)\n![The menu](a.webp)\n![The menu](b.avif)\n![The menu](gone.webp)\n![A site](https://example.com/c.webp)\n';
    const size = (path: string): number | typeof PlayerProse.missing | undefined => sizes[path];

    expect(PlayerProse.media(page, size, PlayerProse.maxPictureBytes)).toEqual([
      'loop.gif: a loop is MP4 or WebM with a poster frame, never GIF',
      'loop.gif: say in its alt text what to notice',
      'loop.gif: no such file',
      'shot.png: a screenshot is WebP or AVIF',
      'shot.png: no such file',
      'a.webp: 300 KB; keep a screenshot to 200 KB',
      'gone.webp: no such file',
    ]);
  });

  it('refuses a link to the old site address and names the new one', () => {
    const page =
      'See the [guide](https://enshwick.github.io/docs/guides/install/).\n' +
      'Or <HTTPS://Enshwick.GitHub.io/docs/uk/>, and the [site](https://enshwick.com/guides/install/).\n';

    expect(PlayerProse.oldLinks(page, 'https://enshwick.com')).toEqual([
      'https://enshwick.github.io/docs/guides/install/: the site lives at https://enshwick.com; link there',
      'HTTPS://Enshwick.GitHub.io/docs/uk/: the site lives at https://enshwick.com; link there',
    ]);
  });

  it('finds old-address links without a scheme and leaves out the punctuation after them', () => {
    const page =
      'Visit enshwick.github.io/docs/guides/install/ today. See //enshwick.github.io/docs/ here.\n' +
      'Read https://enshwick.github.io/docs/guides/. Or <a href="https://enshwick.github.io/docs/">this</a>.\n' +
      'Another host: https://enshwick.github.io.example.org/x and https://enshwick.github.io-x.org/.\n';

    expect(PlayerProse.oldLinks(page, 'https://enshwick.com')).toEqual([
      'enshwick.github.io/docs/guides/install/: the site lives at https://enshwick.com; link there',
      '//enshwick.github.io/docs/: the site lives at https://enshwick.com; link there',
      'https://enshwick.github.io/docs/guides/: the site lives at https://enshwick.com; link there',
      'https://enshwick.github.io/docs/: the site lives at https://enshwick.com; link there',
    ]);
  });
});
