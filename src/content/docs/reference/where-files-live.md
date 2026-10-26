---
title: Where files live
description: Every file and folder enshwick adds to the game folder, and what each one holds.
type: reference
sidebar:
  order: 1
---

All paths are inside the game folder, the one that holds `enshrouded.exe` or
`enshrouded_server.exe`.

| Path                              | What it holds                                                        |
| --------------------------------- | -------------------------------------------------------------------- |
| `powrprof.dll`                    | the file that starts enshwick with the game                          |
| `mods/`                           | one file per mod, such as `enshwick-game-rates.dll`                  |
| `mods/enshwick/mods.toml`         | every mod enshwick found, each with `enabled` to turn it on or off   |
| `mods/enshwick/enshwick.lock`     | the mods that loaded at the last start, with their versions          |
| `mod-configs/<mod id>.toml`       | the settings new worlds start with, one file per mod                 |
| `mod-configs/enshwick.toml`       | enshwick's own settings, such as how much it writes to its logs      |
| `mod-data/<mod id>/`              | what a mod keeps, with each world's settings under `worlds/<world>/` |
| `logs/enshwick/all.log`           | every log line of the last session                                   |
| `logs/enshwick/loader.log`        | enshwick's own lines: which mods loaded and why one did not          |
| `logs/enshwick/mods/<mod id>.log` | one mod's lines                                                      |
| `logs/enshwick/status.log`        | a summary: the game build, every mod and whether it runs             |
| `logs/enshwick/crash.log`         | one line per crash, with the mod, enshwick or the game it came from  |

Each log keeps the two sessions before the last as `all.1.log` and `all.2.log`,
and so on for each file. `crash.log` keeps growing across sessions.

A mod's id names its files. Each mod's page shows it.
