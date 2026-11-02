---
title: Change a mod's settings
description: Set a mod's values for new worlds, for one world, in the game, or on a dedicated server.
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

1. Open the folder that holds your world's save.
   [Back up your worlds](/guides/back-up-saves/) says where it is.
2. Open the folder named after the save and the mod, such as
   `world0-mod-settings/enshwick.game-rates` for `world0.ksd`.
3. Open `settings.toml` there in a text editor.
4. Change the values and save the file.

Most changes to a loaded world apply about one second after you save. A mod's
page says when a setting waits until the world loads again or the game restarts.

## Change settings in the game

Each mod with settings has a **Settings** button on the **Mods** screen.

1. Open **Mods** in the main menu, or in the pause menu beside **Settings**.
2. Select **Settings** under the mod.
3. Change its values.
4. For a text value, click the field, type the text and press Enter.

The page shows your own settings first, under **Your settings**. They apply in
every world. The world's settings follow.

In a world you play alone or host, they show under **This world**. A change
applies only to that world.

In the main menu, they show under **New worlds**. Worlds you make from then on
start with these values.

Only Enter sets a text value. If you leave the field another way, nothing is
set. If a value is refused, the reason shows above the list.

The game's own world settings show no mod settings. When you create a world,
set its mod settings first, in the main menu under **New worlds**.

In a world someone else hosts, the world's settings show but cannot be
changed.

## Change them on a dedicated server

1. Join the server as an admin.
2. Open **Mods** in the pause menu.
3. Select **Settings** under the mod, then **Server settings**.
4. Set the values you want.

Players who are not admins see the server's values but cannot change them.

Each mod's page lists its settings, their defaults and what they do.
