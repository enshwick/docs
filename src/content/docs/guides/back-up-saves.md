---
title: Back up your worlds
description: Copy a modded world with the settings and data its mods keep beside the save, then bring both back. Steam Cloud does not copy the mod folders.
type: how-to
sidebar:
  order: 6
---

To back up a modded world, copy the folder that holds the game's saves. Mods
keep each world's settings and data in folders beside its save, so the copy
takes them along. Close the game or stop the server first.

## Copy the game's save

The game keeps each world where you saved it. In the game's list of saves,
each world is under Steam or under Local.

- Saved to Steam: `Steam\userdata\<your Steam ID>\1203620\remote` in the
  folder where Steam is installed.
- Saved locally: `Saved Games\keen games\Enshrouded` in your user folder.
- On a dedicated server: the `savegame` folder beside `enshrouded_server.exe`.

Copy that folder to a safe place. Beside each save, such as `world0.ksd`, it
holds the folders `world0-mod-settings` and `world0-mod-data`, with what mods
keep for that world.

## What happens when you play on another computer?

Steam Cloud copies a world saved to Steam to your other computers. It does not
copy the world's two mod folders. They stay on the computer where you played.

On the other computer, the world opens without its mod folders. Each mod starts
there with its default settings and none of its data, such as who owns which
Safe. The world itself is not harmed.

When you come back to the first computer, the mods find their old folders
there. They do not know what changed on the other computer.

## Keep the mod data when you change computers

Do these steps each time you move to another computer.

1. Close the game on both computers.
2. On the computer you played on last, open the folder of the world's save.
3. Copy the two folders named after the save, such as `world0-mod-settings`
   and `world0-mod-data`.
4. On the other computer, put them into the same folder, beside the same save.
   Let them replace the files there.
5. Start the game and load the world.

## Bring a world back

1. Close the game or stop the server.
2. Copy the saved folders back to where they came from. Let them replace the
   files there.
3. Start the game and load the world.
