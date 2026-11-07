import { describe, expect, it } from 'vitest';

import { PinRule } from '../pin-rule.ts';

const lines = (text: string, alpha: boolean): number[] =>
  PinRule.of(text, alpha).problems.map(({ line }) => line);

describe('PinRule', () => {
  it('fails crates.io lines and docs.rs links only while the newest release is an alpha', () => {
    const text = [
      'cargo install cargo-enshwick',
      'enshwick = "1"',
      '`enshwick = { version = "1.0", features = ["test"] }`',
      'cargo binstall cargo-enshwick@1.0.0',
      '[API](https://docs.rs/enshwick)',
      '[Load](https://docs.rs/enshwick/latest/enshwick/struct.Load.html)',
    ].join('\n');

    expect(lines(text, true)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(lines(text, false)).toEqual([]);
  });

  it('fails cargo add, docs.rs crate pages and every requirement form as the same lines', () => {
    const text = [
      'cargo add enshwick --features unstable',
      'cargo add --git https://github.com/enshwick/enshwick enshwick',
      'cargo add --git https://github.com/enshwick/enshwick --tag v1.0.0-alpha.13 enshwick',
      '[crate](https://docs.rs/crate/enshwick/latest)',
      'enshwick = ">=1.0, <2"',
      'enshwick = "1.*"',
      'cargo add serde',
    ].join('\n');

    expect(lines(text, true)).toEqual([1, 2, 4, 5, 6]);
  });

  it('counts only the install command and its own words', () => {
    const text = [
      'Run `cargo install cargo-nextest`, then `cargo enshwick new` in enshwick',
      'Install it with `cargo install cargo-enshwick`.',
      '`cargo install cargo-enshwick`, then add `enshwick = { git = "https://github.com/enshwick/enshwick" }`',
      'cargo add serde && cd enshwick',
      'cargo build -p cargo-enshwick',
    ].join('\n');

    expect(lines(text, true)).toEqual([2, 3]);
    expect(lines(text, false)).toEqual([3]);
  });

  it('reads TOML literal strings as basic ones', () => {
    const text = [
      "enshwick = { git = 'https://github.com/enshwick/enshwick', tag = 'v1.0.0-alpha.13' }",
      "enshwick = { git = 'https://github.com/enshwick/enshwick' }",
      "enshwick = '1'",
    ].join('\n');

    expect(lines(text, true)).toEqual([2, 3]);
  });

  it("fails a line of the platform's git without a tag or commit in every case", () => {
    const text = [
      'cargo install --git https://github.com/enshwick/enshwick cargo-enshwick',
      'enshwick = { git = "https://github.com/enshwick/enshwick" }',
      'enshwick = { git = "https://github.com/enshwick/enshwick", branch = "main" }',
    ].join('\n');

    expect(lines(text, false)).toEqual([1, 2, 3]);
  });

  it('passes pinned, inherited, local and unrelated lines', () => {
    const text = [
      'cargo install --git https://github.com/enshwick/enshwick --tag v1.0.0-alpha.13 cargo-enshwick',
      'cargo install --git https://github.com/enshwick/enshwick --rev abc cargo-enshwick',
      'cargo install --path crates/cargo-enshwick',
      'cargo install --path crates/cargo-enshwick cargo-enshwick',
      'cargo install --git https://github.com/someone/fork cargo-enshwick',
      'enshwick = { git = "https://github.com/someone/fork" }',
      'enshwick = { path = "../enshwick", version = "1" }',
      'enshwick = { version = "1",path = "../enshwick" }',
      'cargo install --git https://github.com/rust-cross/cargo-xwin cargo-xwin',
      'cargo install cargo-nextest',
      'enshwick = { git = "https://github.com/enshwick/enshwick", tag = "v1.0.0-alpha.N" }',
      'enshwick = { git = "https://github.com/enshwick/enshwick", rev = "<commit>" }',
      '  enshwick = { workspace = true, features = ["unstable"] }',
      'enshwick = { path = "../enshwick" }',
      'enshwick.workspace = true',
      'log_levels = { enshwick = "debug" }',
      'luau-lsp analyze --definitions:@enshwick=types/enshwick.d.luau main.luau',
      'if enshwick == 1',
      'my-enshwick = "1"',
      '[macros](https://docs.rs/enshwick-macros)',
      '[arc-swap](https://docs.rs/arc-swap)',
    ].join('\n');

    expect(lines(text, true)).toEqual([]);
  });

  it('names what each kind of line lacks', () => {
    expect(PinRule.of('x\nenshwick = "1"', true).problems).toEqual([
      {
        line: 2,
        message: 'takes a crate from crates.io, which has no alpha; take it from git at the tag',
      },
    ]);
  });
});
