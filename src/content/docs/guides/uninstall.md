---
title: Remove a mod or Enshwick
description: Turn one mod off, delete it, or remove Enshwick. Back up your worlds first, since a world opened without its mods loses some of what they added.
type: how-to
sidebar:
  order: 3
---

Before you remove a mod or Enshwick, back up your worlds, as
[Back up your worlds](/guides/back-up-saves/) shows. Close the game or stop the
server. Then turn one mod off, delete it, or remove Enshwick with every mod.

## What does a world lose without its mods?

Enshwick changes none of the game's files on disk. But the game saves what mods
change in its own saves of the world and of each character. They include the
items that mods add, stacks larger than the game allows, terrain, and the
experience of characters.

When you remove one mod and keep Enshwick:

- Each item that the mod added stays as "Item of a removed mod". Its stacks
  shrink to the stack size of the game's item that the mod copied. Install the
  mod again, and the item comes back.
- An object that the mod copied from the game's own, and that you placed, loads
  as the game's object it copies.
- Stacks of the game's own items keep the counts that the world was saved with.
- With Better Altars, only the first 16 altar zones work as bases.
- A hold that the mod set beside a world's save stops the game before that
  world loads.
  [Open a world that a removed mod holds](#open-a-world-that-a-removed-mod-holds)
  shows what to do. A hold in the mod's own folder goes when you delete or move that
  folder.

When you remove Enshwick:

- The world loses every item that mods added. The next save keeps the loss.
- Each stack larger than the game allows shrinks to the game's own size. The
  next save keeps the smaller count.
- No hold works, so a world that a mod holds opens anyway.
- With Better Altars, only the first 16 altar zones work as bases.
- Weather that a mod added can show as other weather until it ends.
- Characters keep their experience, levels and skill points.
- Terrain that a mod changed inside a base stays.

On a dedicated server, the game keeps its settings in `enshrouded_server.json`.
Game settings that a mod changed can stay there after you remove the mod or
Enshwick.

To get a world back as it was, put back your copy of it, Enshwick and its mods.

## Turn off one mod

1. Open the `mods` folder inside the game folder.
2. Move the mod's folder, such as `enshwick.game-rates`, out of `mods`, to a
   folder of your own.
3. Start the game. The **Mods** screen no longer lists the mod.

To turn the mod back on, move its folder back into `mods`.

## Delete one mod

1. Open the `mods` folder inside the game folder.
2. Delete the mod's folder, such as `enshwick.game-rates`.

Each world keeps the mod's settings and data in the folders beside its save, such as
`world0-mod-settings/enshwick.game-rates` and
`world0-mod-data/enshwick.game-rates`. Delete them too for a clean removal.

## Open a world that a removed mod holds

Some mods keep a world that the game without them cannot open safely. Such a mod
sets a hold: a file `hold.txt` in the mod's folder in `mods`, or in its folder
beside one world's save. While the mod does not run, the game stops before that
world loads, and the log names the mod.

To open the world anyway, delete the mod's `hold.txt`, at your own risk. It is
`mods/<mod id>/hold.txt`, or `world0-mod-data/<mod id>/hold.txt` for one world.
The log names the file.

## Remove Enshwick

Delete `powrprof.dll` from the game folder. The game then starts without
Enshwick and without any Enshwick mod.

You may also delete Enshwick's other files.
[Where files live](/reference/where-files-live/) lists them.

Some other mod loaders keep their mods in the `mods` folder too. When no other
loader uses it, you may delete the whole folder.

Otherwise, delete the `enshwick` folder and each folder named after an Enshwick
mod's id; the mod's page shows its id. Another loader may not start while these
folders are there.

On Linux and Steam Deck, also remove the line you added to the game's **Launch
options**.

:::caution
The folders beside your saves hold what mods keep for each world. Keep a copy
before you delete them, as [Back up your worlds](/guides/back-up-saves/) shows.
:::
