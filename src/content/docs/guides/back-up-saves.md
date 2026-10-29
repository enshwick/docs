---
title: Back up your worlds
description: Copy a world and everything mods keep for it, so you can bring both back.
type: how-to
sidebar:
  order: 6
---

To back up a modded world, copy two things: the game's own save, and the folders
where Enshwick keeps mod data. Close the game or stop the server first.

## Copy the game's save

The game keeps your worlds in one of two places. The place depends on whether
Steam Cloud is on for Enshrouded.

- With Steam Cloud on: `Steam\userdata\<your Steam ID>\1203620\remote` in the
  folder where Steam is installed.
- With Steam Cloud off: `Saved Games\Enshrouded` in your user folder.
- On a dedicated server: the `savegame` folder beside `enshrouded_server.exe`.

Copy that folder to a safe place.

## Copy what mods keep

Copy these two folders from the game folder to the same safe place:

- `mod-data`, with each mod's data and its settings for every world.
- `mod-configs`, with the settings new worlds start with.

## Bring a world back

1. Close the game or stop the server.
2. Copy the saved folders back to where they came from. Let them replace the
   files there.
3. Start the game and load the world.
