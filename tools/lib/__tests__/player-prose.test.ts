import { describe, expect, it } from 'vitest';

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

  it('refuses a GIF, another still format, a missing alt text and a large picture', () => {
    const sizes: Record<string, number> = { 'a.webp': 300 * 1024 };
    const page = '![](loop.gif)\n![The menu](shot.png)\n![The menu](a.webp)\n![The menu](b.avif)\n';

    expect(PlayerProse.media(page, (path) => sizes[path], PlayerProse.maxPictureBytes)).toEqual([
      'loop.gif: a loop is MP4 or WebM with a poster frame, never GIF',
      'loop.gif: say in its alt text what to notice',
      'shot.png: a screenshot is WebP or AVIF',
      'a.webp: 300 KB; keep a screenshot to 200 KB',
    ]);
  });
});
