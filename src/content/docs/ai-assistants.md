---
title: For AI assistants
description: The facts an AI coding assistant needs to write an Enshwick mod, with links to the full pages.
type: reference
slug: dev/ai-assistants
---

Enshwick is a modding API platform for the game Enshrouded. A mod for it is a
data pack, a Luau mod or a Rust mod. Choose the smallest kind that does the job.
Check every API name in the [API reference](https://docs.rs/enshwick) or in the
guide before you use it.

## Kinds of mod

| Kind      | What it is                                                                                                         | Command to start one                        |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Data pack | a folder with `pack.toml` and TOML files that change items, recipes, loot and other game data; no code             | `cargo enshwick new --data <author>.<name>` |
| Luau mod  | a data pack with Luau scripts; each mod runs in its own sandbox and reaches the game through the global `enshwick` | `cargo enshwick new --luau <author>.<name>` |
| Rust mod  | a Windows DLL built against the `enshwick` crate, with the full API, hooks included                                | `cargo enshwick new <author>.<name>`        |

## Tools

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-enshwick
```

A Rust mod needs Rust 1.99 or newer and, on Windows, the MSVC build tools.
[Getting started](/dev/getting-started/) has the details.

## Mod ids

- A mod id is `<author>.<name>`. Each part uses `[a-z0-9-]`, and the whole id
  has at most 64 characters. The name starts with a letter.
- The id names the mod's files: `mod-configs/<id>.toml` for settings,
  `mod-data/<id>/` for data, and `logs/enshwick/mods/<id>.log` for the log.

## Rust mods

- `cargo enshwick new <id> --side server` makes a `cdylib` crate. `--side` takes
  `server` (the default), `client` or `both`.
- The release profile needs `panic = "unwind"`. In a Cargo workspace, set it in
  the workspace root.
- A mod implements `enshwick::Mod`: `manifest()` returns
  `enshwick::manifest!(id: ..., side: ...)`, and `init(load: &mut Load)` sets
  the mod up. `enshwick::declare_mod!` exports it.
- Settings are a type that derives `enshwick::Config`. `load.config()` reads it,
  and `load.on_config_change` applies an edited file.
- A mod that changes values a server and its players share sets `side: BOTH` and
  `join: true`. See [The join check](/dev/concepts/join-check/).
- Use an API call where one exists, such as `load.on_altar_limit`. A hook
  (`detour!`, `load.symbol`, `load.hook`) is `unsafe` and is the last resort.
  See [Hooks](/dev/hooks/).
- Handlers run inside the game's frame. Keep them short. A tick handler runs
  every 100 ms by default. See [Events and the scheduler](/dev/events/).
- `cargo enshwick install --game <game folder>` builds the mod in release and
  copies the DLL into the game's `mods` folder.

A complete Rust mod:

```rust
use std::sync::atomic::{AtomicU8, Ordering};

use enshwick::{Load, Mod, Off};

/// Flame Altar settings.
#[derive(serde::Deserialize, serde::Serialize, enshwick::Config)]
#[serde(deny_unknown_fields)]
struct Settings {
    /// Altars allowed at every Flame level, 1 to 16.
    altars: u8,
}

impl Default for Settings {
    fn default() -> Self {
        Self { altars: 16 }
    }
}

static ALTARS: AtomicU8 = AtomicU8::new(16);

fn apply(settings: &Settings) {
    ALTARS.store(settings.altars.clamp(1, 16), Ordering::Relaxed);
}

struct AltarCount;

impl Mod for AltarCount {
    fn manifest() -> &'static enshwick::abi::Manifest {
        enshwick::manifest!(id: "you.my-altar-count", side: BOTH, join: true)
    }

    fn init(load: &mut Load<'_>) -> Result<Self, Off> {
        let settings: Settings = load.config()?;
        apply(&settings);
        load.on_altar_limit(|limit| limit.allowed = ALTARS.load(Ordering::Relaxed))?;
        load.on_config_change(|settings: Settings| apply(&settings))?;
        enshwick::info!("{} altars per Flame level", settings.altars);
        Ok(Self)
    }
}

enshwick::declare_mod!(AltarCount);
```

## The unstable feature

- From 1.0, the `enshwick` crate follows Semantic Versioning.
- The `unstable` feature holds young APIs that may change in any release, such
  as `world`, `map`, `actions`, `console`, `script`, `rates` and damage filters.
  The API reference marks each of these items "Unstable".
- Turn it on only when the mod needs such an item:

  ```toml
  [dependencies]
  enshwick = { version = "1", features = ["unstable"] }
  ```

- In Luau, `enshwick.d.luau` marks the unstable parts, such as the `world`
  namespace.

[Stability](/dev/stability/) lists every unstable part.

## Tests with the fake host

`enshwick::test` is a fake loader for unit tests. It runs without the game. Turn
on its `test` feature for tests only:

```toml
[dev-dependencies]
enshwick = { version = "1", features = ["test"] }
```

1. Build a `FakeHost` with what the game would answer: symbols, settings text,
   the side.
2. Call `install()`. The returned fake is the loader until it drops.
3. Start the mod:
   `unsafe { loader.start(enshwick_mod_init, enshwick_mod_ready) }`.
   `declare_mod!` writes these two exports.
4. Check the status, `loader.logs()` and `loader.faults()`. Call a detour or
   raise an event as the game would.

A lookup the test did not set answers `Status::MISSING`. Settings default to the
mod's own defaults. [Testing](/dev/testing/) has full examples.

## Luau mods

A Luau mod is a folder with `pack.toml`, `main.luau` and
`types/enshwick.d.luau`. Copy the folder into the game's `mods` folder as
`mods/<id>/`.

```luau
--!strict
enshwick.on("PlayerJoined", function(player)
    enshwick.world.broadcast(`entity {player.entity} joined`)
end)
```

Check the types without the game:

```bash
luau-lsp analyze --definitions:@enshwick=types/enshwick.d.luau main.luau
```

Names follow the Rust API: the event `PlayerJoined` is `events::PlayerJoined`.
[Luau mods](/dev/luau/) lists every call.

## Data packs

- `pack.toml` holds at least `id` and `version`.
- Changes go into files such as `items.toml`, by the game's own item names.
- `cargo enshwick pack check <folder> --game <game folder>` checks every file
  against the game's data.
- The server and every player need the same pack. The join check lets in only
  players with the same pack.

[A mod without Rust](/dev/content/a-mod-without-rust/) is a walkthrough.
[Data packs](/dev/content/packs/) lists every file and field.

## Where to read more

- [API reference on docs.rs](https://docs.rs/enshwick): every public item of the
  `enshwick` crate.
- [Introduction](/dev/) to the guide for mod makers.
- [llms.txt](/llms.txt): the index of the files for language models, with a set
  for mod makers.
- [Source and examples](https://github.com/enshwick/enshwick): the `examples`
  folder holds Rust, Luau and data pack mods.
