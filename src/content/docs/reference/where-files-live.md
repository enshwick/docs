---
title: Where files live
description: Every file and folder Enshwick adds to the game folder and beside each save, and what each one holds.
type: reference
sidebar:
  order: 1
---

Enshwick keeps files in two places. What belongs to the installation lies in
the game folder. What belongs to one world lies beside that world's save.

## In the game folder

The game folder is the one that holds `enshrouded.exe` or
`enshrouded_server.exe`.

| Path                                     | What it holds                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `powrprof.dll`                           | the file that starts Enshwick with the game                                      |
| `mods/enshwick/`                         | Enshwick itself, `enshwick.dll`, and the files it keeps for this installation    |
| `mods/<mod id>/`                         | one folder per mod, with the mod's files; a mod runs while its folder is there   |
| `mods/<mod id>/hold.txt`                 | a hold the mod set: the game stops while the mod does not run                    |
| `mod-configs/<mod id>.toml`              | the settings new worlds start with, one file per mod                             |
| `mod-configs/enshwick.toml`              | the settings of Enshwick itself, such as how much it writes to its logs          |
| `logs/enshwick/all.log`                  | every log line of the last session                                               |
| `logs/enshwick/loader.log`               | the lines of Enshwick itself: which mods loaded and why a mod did not            |
| `logs/enshwick/mods/<mod id>.log`        | the lines of one mod                                                             |
| `logs/enshwick/status.log`               | a summary: the game build, every mod and whether it runs                         |
| `logs/enshwick/crash.log`                | one line per crash, with the mod, Enshwick or the game it came from              |

`mods/enshwick/` also holds `clones.toml`, the items and objects mods copied
from the game's own, and `kept-stacks.toml`, the stack sizes a world was saved
with. Keep both files.

## Beside each save

The game keeps each world as a file such as `world0.ksd`. The name is a slot,
`world0`, `world1` and so on, not the world's name. Enshwick keeps two folders
beside each world's save, named after that file:

| Path                            | What it holds                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `world0-mod-settings/<mod id>/` | the world's settings of a mod                                                       |
| `world0-mod-data/<mod id>/`     | what a mod keeps for the world, such as who owns which Safe                         |
| `world0-mod-data/enshwick/`     | what Enshwick keeps for the world, such as the mods it last ran with in `mods.lock` |

[Back up your worlds](/guides/back-up-saves/) says where the game keeps its
saves. Copy the save and its two folders together, and the world keeps
everything its mods know.

## When a new world takes an old name

When you delete a world in the game, the game keeps its two folders. The next
new world gets the same name, such as `world2.ksd`.

Enshwick sees that the folders belong to the old world. It renames them, such
as to `world2-mod-data.old-2026-11-02-14-30-00`. The new world starts with each
mod's defaults.

Nothing is deleted. Delete the renamed folders when you no longer need them.

To reset a world, delete its save and its two folders.

## Logs and backups

Each log keeps the two sessions before the last one, such as `all.1.log` and
`all.2.log`. `crash.log` keeps growing across sessions.

A log can also fill up during a long session. `all.log` holds up to 32 MiB, and
each other log up to 8 MiB. A full log moves to `all.1.log` in the same way,
and a new `all.log` starts.

When Enshwick writes one of its files again, it keeps the old one beside it,
such as `clones.toml.bak`.

A mod's id names its folders, such as `enshwick.game-rates`. Each mod's page
shows its id.
