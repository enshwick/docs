---
title: Back up your worlds
description: Copy a world and everything mods keep for it, so you can bring both back.
type: how-to
sidebar:
  order: 6
---

To back up a modded world, copy the folder that holds the game's saves. Mods
keep each world's settings and data in folders beside its save, so the copy
takes them along. Close the game or stop the server first.

## Copy the game's save

The game keeps your worlds in one of two places. The place depends on whether
Steam Cloud is on for Enshrouded.

- With Steam Cloud on: `Steam\userdata\<your Steam ID>\1203620\remote` in the
  folder where Steam is installed.
- With Steam Cloud off: `Saved Games\Enshrouded` in your user folder.
- On a dedicated server: the `savegame` folder beside `enshrouded_server.exe`.

Copy that folder to a safe place. Beside each save, such as `world0.ksd`, it
holds the folders `world0-mod-settings` and `world0-mod-data`, with what mods
keep for that world.

Steam Cloud copies only the game's own files to your other computers, not the
folders of mods. Back them up yourself.

## Bring a world back

1. Close the game or stop the server.
2. Copy the saved folders back to where they came from. Let them replace the
   files there.
3. Start the game and load the world.
