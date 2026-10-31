import { ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';

/** The brand's colours as code highlighting reads them; Shiki needs plain values, not variables. */
const palette = {
  ground: '#110f17',
  bar: '#17151f',
  line: '#2a2633',
  text: '#d8d2e0',
  bone: '#e9e1d3',
  muted: '#bdb6c9',
  comment: '#847d94',
  mist: '#8c8fd6',
  mistLight: '#b3b5ea',
  core: '#ffd27a',
  flame: '#ff8a3d',
  selection: '#3d3770',
} as const;

/** The editor colours: the code ground, its bar and tabs, line numbers and the focus ring. */
const colors = {
  'editor.background': palette.ground,
  'editor.foreground': palette.text,
  'editor.selectionBackground': palette.selection,
  'editorLineNumber.foreground': palette.comment,
  'editorLineNumber.activeForeground': palette.muted,
  'editorGroupHeader.tabsBackground': palette.bar,
  'tab.activeBackground': palette.ground,
  'tab.activeForeground': palette.bone,
  'tab.inactiveForeground': palette.muted,
  'tab.border': palette.line,
  'tab.activeBorderTop': palette.flame,
  'terminal.background': palette.ground,
  'terminal.foreground': palette.text,
  focusBorder: palette.core,
};

/** The token colours, by TextMate scope. */
const tokenColors = [
  {
    scope: ['comment', 'punctuation.definition.comment'],
    settings: { foreground: palette.comment },
  },
  {
    scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.operator.word'],
    settings: { foreground: palette.mist },
  },
  {
    scope: [
      'meta.attribute',
      'entity.name.function.macro',
      'support.function.macro',
      'meta.annotation',
    ],
    settings: { foreground: palette.mist },
  },
  {
    scope: [
      'string',
      'constant.numeric',
      'constant.language',
      'constant.character',
      'markup.inline.raw',
    ],
    settings: { foreground: palette.core },
  },
  {
    scope: ['entity.name.type', 'support.type', 'entity.name.namespace', 'entity.name.class'],
    settings: { foreground: palette.mistLight },
  },
  {
    scope: ['entity.name.function', 'support.function'],
    settings: { foreground: palette.bone },
  },
  {
    scope: ['variable', 'variable.other', 'meta.definition.variable'],
    settings: { foreground: palette.text },
  },
  {
    scope: ['punctuation', 'keyword.operator', 'meta.brace'],
    settings: { foreground: palette.muted },
  },
  {
    scope: ['entity.name.tag', 'support.type.property-name', 'entity.other.attribute-name'],
    settings: { foreground: palette.mist },
  },
  {
    scope: ['markup.heading', 'markup.bold'],
    settings: { foreground: palette.bone, fontStyle: 'bold' },
  },
  { scope: ['markup.deleted'], settings: { foreground: palette.flame } },
  { scope: ['markup.inserted'], settings: { foreground: palette.mistLight } },
];

/** The site's themes for code blocks, in the brand's colours. */
export class CodeTheme {
  /**
   * The night theme: mist for keywords and attributes, the core's gold for strings and numbers,
   * comments faint, everything else in the body ink.
   */
  public static readonly night = new ExpressiveCodeTheme({
    name: 'enshwick-night',
    type: 'dark',
    colors,
    tokenColors,
  });
}
