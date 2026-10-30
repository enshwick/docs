import { describe, expect, it } from 'vitest';

import { Snippet, SnippetLanguage } from '../snippet.ts';

describe('Snippet', () => {
  it('escapes the code so it reads as text, not markup', () => {
    expect(new Snippet('a < b && c > d', SnippetLanguage.Rust).html()).toBe(
      'a &lt; b &amp;&amp; c &gt; d',
    );
  });

  it('marks keywords, numbers, strings and comments of the language', () => {
    expect(new Snippet('let x = 12; // twelve', SnippetLanguage.Rust).html()).toBe(
      '<span class="ew-tok-keyword">let</span> x = <span class="ew-tok-number">12</span>; ' +
        '<span class="ew-tok-comment">// twelve</span>',
    );
  });

  it('marks a word as a keyword only in its own language', () => {
    expect(new Snippet('local end', SnippetLanguage.Rust).html()).toBe('local end');
    expect(new Snippet('end', SnippetLanguage.Luau).html()).toBe(
      '<span class="ew-tok-keyword">end</span>',
    );
  });

  it('keeps a keyword inside a string a string', () => {
    expect(new Snippet('"let it be"', SnippetLanguage.Rust).html()).toBe(
      '<span class="ew-tok-text">"let it be"</span>',
    );
  });
});
