---
title: Change a mod's settings
description: Set a mod's values for one world, for new worlds, or on a dedicated server.
type: how-to
sidebar:
  order: 5
---

Each world keeps its own copy of every mod's settings. You change them in the
game, on the screens where you change the world's own settings.

## Change them for one world

1. Load the world you host, or open the screen that starts or creates a world.
2. Open the world settings and go to the last tab.
3. Find the mod's rows and set the values you want.

Most changes work at once. A mod's page says when a setting waits for the world
to load again or for the game to restart.

## Change them on a dedicated server

1. Join the server as an admin.
2. Open **Mods** in the pause menu.
3. Select **Server settings** and set the values you want.

## Change the values new worlds start with

Each mod writes its settings to a file in the `mod-configs` folder of the game
folder on its first start, named after the mod's id, such as `game-rates.toml`.
Open it in a text editor and save it with your values. Worlds made from then on
start with them; a world you already have keeps its own copy.

Each mod's page lists its settings, their defaults and what they do.
