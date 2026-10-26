---
title: Update enshwick and its mods
description: Replace the files of an older enshwick install with a newer archive.
type: how-to
sidebar:
  order: 2
---

To update, extract the newest archive over the old install. Your settings and
world data stay, since the archive holds none of them.

1. Close the game or stop the server.
2. Download
   [enshwick.zip](https://github.com/enshwick/enshwick/releases/download/dev/enshwick.zip)
   again.
3. Extract it into the game folder, and let it replace the files that are
   already there.
4. Start the game. The **Mods** screen lists every mod with its new version.

When you play on a server, update when the server does. A server turns away a
player whose mods differ from its own, and says which mod and version it needs.

## A mod changed its name

A mod that has a new name comes with a new file. The old file stays in the
`mods` folder until you delete it. enshwick runs only the newer one, and its
`loader.log` names the old file you can delete.
[Where files live](/reference/where-files-live/) shows where that log is.
