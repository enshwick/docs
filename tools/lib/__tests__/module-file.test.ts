import { describe, expect, it } from 'vitest';

import { ModuleFile } from '../module-file.ts';

const workspace = `[workspace]
members = ["crates/*"]

[workspace.dependencies]
enshwick-abi = { path = "crates/internal/abi", version = "=1.0.0-alpha.14" }
`;

describe('ModuleFile', () => {
  it('finds a module the API crate declares in its own source', () => {
    expect(ModuleFile.path('pub mod abi;\n', workspace, 'abi')).toBe('crates/enshwick/src/abi.rs');
  });

  it('finds a re-exported module in the internal crate the workspace places', () => {
    expect(ModuleFile.path('#[doc(inline)]\npub use enshwick_abi::abi;\n', workspace, 'abi')).toBe(
      'crates/internal/abi/src/abi.rs',
    );
  });

  it('finds nothing for a module re-exported from a crate the workspace gives no path', () => {
    expect(ModuleFile.path('pub use enshwick_abi::abi;\n', undefined, 'abi')).toBeUndefined();
    expect(ModuleFile.path('pub use enshwick_raw::raw;\n', workspace, 'raw')).toBeUndefined();
  });
});
