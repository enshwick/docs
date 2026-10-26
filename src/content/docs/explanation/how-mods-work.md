---
title: How mods work, and are they safe?
description: What enshwick does when the game starts, what a mod can reach, and how to judge whether a mod is safe to run.
type: explanation
sidebar:
  order: 1
---

A mod is a program that runs inside the game with the same rights as the game
itself. That is why mods can change so much, and why you install only mods whose
source you trust.

## What happens when the game starts

Windows loads a file named `powrprof.dll` for every program that asks for it,
and Enshrouded asks for it at start. Windows looks in the game folder first.
enshwick puts its own file of that name there, so it starts together with the
game. It then hands each request on to the real Windows file, so the game works
as before.

enshwick then reads the `mods` folder and starts each mod in it. Before any mod
changes anything, enshwick checks the game's version against what it knows. A
game update can move the parts of the game that mods change. When enshwick
cannot find such a part, it turns off the features that need it and leaves the
rest running. It writes what it turned off to its log.

## What a mod can change

Each mod asks enshwick for the parts of the game it wants to change, such as a
recipe or the comfort of a chair. enshwick knows where those parts live in each
version of the game, so a mod does not have to guess.

When two mods or more change the same thing, enshwick chains them, so each gets
its turn. When a mod fails, enshwick turns that mod off, and the game goes on
without it. The log names the mod and what went wrong.

## Mods and multiplayer

Some mods change values that a server and its players share, like the pieces a
recipe makes. A server compares those mods with yours as you join. If they differ, the game tells you which mod and version you need,
instead of letting you play in a world that breaks.
[Play on a server](/guides/play-on-a-server/) shows what each case looks like.

Other mods change only what you see or do on your own computer, such as a
camera. Those stay your own choice on any server.

## Is it safe?

A mod can do anything the game can do on your computer. It can read and write
your files and reach the network. enshwick does not lock a mod in.

So safety comes from where a mod comes from:

- **Our mods** are open source. Anyone can read every line, and each file you
  download is built from that code on our own build machines. Each download
  comes with a record that ties it to the exact code it came from, and [our
  security policy](https://github.com/enshwick/.github/blob/main/SECURITY.md#check-a-download)
  shows how to check it.
- **Other people's mods** are as safe as their authors. Prefer mods whose code
  you can read, from authors you have reason to trust.
- **Never run a mod file someone sent you in a chat** without knowing where it
  was built.

enshwick leaves the game's files on disk as they are. Delete `powrprof.dll` and the
game starts exactly as it did before, as
[Remove a mod or enshwick](/guides/uninstall/) shows.

## Your worlds

A mod that keeps its own data for a world, such as who owns a chest, keeps it in
the `mod-data` folder, beside the game's own save.
[Back up your worlds](/guides/back-up-saves/) explains how to keep a copy of
both.
