---
title: How mods work, and are they safe?
description: What Enshwick does when the game starts, what a mod can reach, and how to judge whether a mod is safe to run.
type: explanation
sidebar:
  order: 1
---

Enshwick runs mods in Rust and Luau, and data packs. A Rust mod runs inside the
game with the same rights as the game. For this reason, it can change a lot. For
the same reason, install only mods from sources you trust.

## What happens when the game starts

Windows loads the file `powrprof.dll` for every program that asks for it.
Enshrouded asks for it at start. Windows looks in the game folder first.
Enshwick puts its own file with that name there, so Enshwick starts together
with the game. It passes each request on to the real Windows file, so the game
works as before.

Enshwick then reads the `mods` folder and starts each mod in it. Before any mod
changes anything, Enshwick checks the game's version against what it knows. A
game update can move the parts of the game that mods change. When Enshwick
cannot find such a part, it turns off the features that need it. The rest keeps
running. Enshwick writes what it turned off to its log.

## What a mod can change

Each mod asks Enshwick for the parts of the game it wants to change, such as a
recipe or the comfort of a chair. Enshwick knows where those parts are in each
version of the game. A mod does not have to guess.

When two or more mods change the same thing, Enshwick puts them in a chain. Each
mod gets its turn. When a mod fails, Enshwick turns that mod off, and the game
goes on without it. The log names the mod and what went wrong.

## Mods and multiplayer

Some mods change values that a server and its players share, such as the pieces
a recipe makes. A server compares those mods with yours when you join. If they
differ, the game tells you which mod and version you need. It does not let you
into a world that would break. [Play on a server](/guides/play-on-a-server/)
shows each case.

Other mods change only what you see or do on your own computer, such as a
camera. You choose those mods yourself on any server.

## Is it safe?

A Rust mod can do anything the game can do on your computer. It can read and
write your files and reach the network. Enshwick does not lock a Rust mod in.

A Luau mod runs in a sandbox. It reaches the game only through Enshwick. A data
pack holds no code, and a server sends you only data, never code.

So the safety of a Rust mod depends on where it comes from:

- **Our mods** are open source. Anyone can read every line. Each file you
  download is built from that code on our own build machines. Each download
  comes with a record that ties it to the exact code it came from.
  [Our security policy](https://github.com/enshwick/.github/blob/main/SECURITY.md#check-a-download)
  shows how to check it.
- **Other people's mods** are as safe as their authors. Prefer mods whose code
  you can read, from authors you have reason to trust.
- **Never run a mod file someone sent you in a chat** if you do not know where
  it was built.

Enshwick leaves the game's files on disk as they are. Delete `powrprof.dll`, and
the game starts exactly as it did before.
[Remove a mod or Enshwick](/guides/uninstall/) shows how.

## Your worlds

Some mods keep their own data for a world, such as who owns a chest. They keep
it in the `mod-data` folder, beside the game's own save.
[Back up your worlds](/guides/back-up-saves/) shows how to keep a copy of both.
