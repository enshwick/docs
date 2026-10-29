---
title: Change a mod's settings
description: Set a mod's values for new worlds, for one world, or on a dedicated server.
type: how-to
sidebar:
  order: 5
---

Each world keeps its own copy of every mod's settings. The world takes this copy
when it first loads. New worlds start from the values in the `mod-configs`
folder.

## Change the values new worlds start with

1. Start the game once with the mod. The mod then writes its settings file.
2. Open the `mod-configs` folder in the game folder.
3. Open the file named after the mod's id, such as `enshwick.game-rates.toml`,
   in a text editor.
4. Change the values and save the file.

Worlds you make from then on start with your values. A world you already have
keeps its own copy.

## Change them for one world

1. Open `mod-data/<mod id>/worlds/` in the game folder. It holds one folder per
   world.
2. Open `settings.toml` in the folder of your world, in a text editor.
3. Change the values and save the file.

Most changes to a loaded world apply about one second after you save. A mod's
page says when a setting waits until the world loads again or the game restarts.

## Change them on a dedicated server

1. Join the server as an admin.
2. Open **Mods** in the pause menu.
3. Select **Server settings** and set the values you want.

Each mod's page lists its settings, their defaults and what they do.
