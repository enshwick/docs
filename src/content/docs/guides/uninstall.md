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
