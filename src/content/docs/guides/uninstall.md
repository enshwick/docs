---
title: Remove a mod or Enshwick
description: Turn one mod off, delete it, or take Enshwick out of the game folder.
type: how-to
sidebar:
  order: 3
---

Your game saves stay as they are in every case. Close the game or stop the
server first. Then turn one mod off, delete it, or remove Enshwick with every
mod.

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
Enshwick and without any mod.

You may also delete the `mods` and `mod-configs` folders and `enshwick.toml`.
The same goes for the `enshwick` files in `logs` and
the folders that end in `-mod-settings` and `-mod-data` beside your saves. Only
Enshwick uses them.

On Linux and Steam Deck, also remove the line you added to the game's **Launch
options**.

:::caution
The folders beside your saves hold what mods keep for each world. Keep a copy
before you delete them, as [Back up your worlds](/guides/back-up-saves/) shows.
:::
