---
title: Change a mod's settings
description: Set a mod's values for one world, in the game or in its file, or on a dedicated server.
type: how-to
sidebar:
  order: 5
---

Mod settings belong to each world. Each world keeps them beside its save. The
loader writes them from the mod's defaults when the world first loads. A
change applies when the world loads again.

## Change settings in the game

Each mod with settings has a **Settings** button on the **Mods** screen while
you are in a world.

1. Load the world.
2. Open **Mods** in the pause menu, beside **Settings**.
3. Select **Settings** under the mod.
4. Change its values.
5. For a text value, click the field, type the text and press Enter.

The change is saved for this world. It applies when you load the world again.

Only Enter sets a text value. If you leave the field another way, nothing is
set. If a value is refused, the reason shows above the list.

In the main menu, the **Mods** screen shows no **Settings** button. Open a
world to change its settings.

In a world someone else hosts, the settings show but cannot be changed.

## Change them in the world's file

1. Open the folder that holds your world's save.
   [Back up your worlds](/guides/back-up-saves/) says where it is.
2. Open the folder named after the save and the mod, such as
   `world0-mod-settings/enshwick.game-rates` for `world0.ksd`.
3. Open `settings.toml` there in a text editor.
4. Change the values and save the file.

The change applies when the world loads again. The folder exists after the
world loaded once with the mod.

When a newer version of the mod adds or removes a setting, the loader adds or
removes it as the world loads. It keeps a copy of the old file as
`settings.toml.bak`.

## Change them on a dedicated server

1. Join the server as an admin.
2. Open **Mods** in the pause menu.
3. Select **Settings** under the mod, then **Server settings**.
4. Set the values you want.
5. Restart the server. The values apply when its world loads again.

Players who are not admins see the server's values but cannot change them.

Each mod's page lists its settings, their defaults and what they do.
