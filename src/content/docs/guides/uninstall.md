---
title: Remove a mod or enshwick
description: Turn one mod off, delete it, or take enshwick out of the game folder.
type: how-to
sidebar:
  order: 3
---

Your game saves stay as they are in every case. Close the game or stop the
server first. Then turn one mod off, delete it, or
take out enshwick with every mod.

## Turn off one mod

1. Open the `mods/enshwick` folder inside the game folder.
2. Open `mods.toml` in a text editor such as Notepad.
3. Find the lines for the mod, named by its id such as `game-rates`, and change
   `enabled = true` to `enabled = false`.
4. Save the file and start the game. The **Mods** screen no longer lists the
   mod.

The mod stays in the folder and is easy to turn back on later.

## Delete one mod

1. Open the `mods` folder inside the game folder.
2. Delete the mod's file. Its name starts with `enshwick-` and ends in `.dll`,
   such as `enshwick-game-rates.dll`.

## Remove enshwick

Delete `powrprof.dll` from the game folder. The game then starts without
enshwick and without any mod. You may also delete the `mods`, `mod-configs`,
`mod-data` and `logs/enshwick` folders, which only enshwick uses.

On Linux and Steam Deck, also clear the line you added to the game's **Launch
options**.

:::caution
`mod-data` holds what mods keep for each world. Keep a copy before you delete
it, as [Back up your worlds](/guides/back-up-saves/) shows.
:::
