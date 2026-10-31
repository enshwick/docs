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

1. Open the `mods/enshwick` folder inside the game folder.
2. Open `mods.toml` in a text editor such as Notepad.
3. Find the lines for the mod. They start with its id, such as
   `enshwick.game-rates`. Change `enabled = true` to `enabled = false`.
4. Save the file and start the game. The **Mods** screen no longer lists the
   mod.

The mod stays in the folder. You can turn it back on later.

## Delete one mod

1. Open the `mods` folder inside the game folder.
2. Delete the mod's file. Its name starts with `enshwick-` and ends in `.dll`,
   such as `enshwick-game-rates.dll`.

Its settings in `mod-configs` and its data in `mod-data` stay. Delete them too
for a clean removal.

## Open a world that a removed mod holds

Some mods keep a world that the game without them cannot open safely. Such a mod
sets a hold: a file `hold.txt` in its `mod-data` folder. While the mod does not
run, the game stops before that world loads, and the log names the mod.

To open the world anyway, delete the mod's `hold.txt`, at your own risk. It is
`mod-data/<mod id>/hold.txt`, or `mod-data/<mod id>/worlds/<world>/hold.txt`
for one world. The log names the file.

## Remove Enshwick

Delete `powrprof.dll` from the game folder. The game then starts without
Enshwick and without any mod. You may also delete the `mods`, `mod-configs`,
`mod-data` and `logs/enshwick` folders. Only Enshwick uses them.

On Linux and Steam Deck, also remove the line you added to the game's **Launch
options**.

:::caution
`mod-data` holds what mods keep for each world. Keep a copy before you delete
it, as [Back up your worlds](/guides/back-up-saves/) shows.
:::
