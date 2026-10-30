---
title: Update Enshwick and its mods
description: Replace the files of Enshwick and of your mods with newer archives.
type: how-to
sidebar:
  order: 2
---

Enshwick and each mod update on their own: extract the newest archive over
the old files. Your settings and world data stay. No archive holds them.

1. Close the game or stop the server.
2. Download
   [enshwick.zip](https://github.com/enshwick/enshwick/releases/download/dev/enshwick.zip)
   again, and the archive of each mod you use from its page.
3. Extract them into the game folder. Let them replace the files that are
   already there.
4. Start the game. The **Mods** screen lists every mod with its new version.

If you play on a server, update when the server does. A server turns away a
player whose mods differ from its own. It says which mod and version it needs.

## A mod changed its name

A mod with a new name comes as a new file. The old file stays in the `mods`
folder until you delete it. Enshwick runs only the new one. Its `loader.log`
names the old file, so you can delete it.
[Where files live](/reference/where-files-live/) shows where that log is.
