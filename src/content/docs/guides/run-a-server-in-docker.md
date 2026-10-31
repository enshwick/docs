---
title: Run a server in Docker or Kubernetes
description: Put Enshwick and its mods into a server image, roll out new versions, move worlds and check what each server loaded.
type: how-to
sidebar:
  order: 8
---

A dedicated server in a container gets Enshwick from the files next to
`enshrouded_server.exe`. Nothing installs them for you. The image, or a volume,
carries them at the versions you chose.

## Put the files into the image

Put `powrprof.dll` and the `mods` folder into the image beside the server. A
volume mounted there works too.

- `enshwick.zip` holds Enshwick and no mod. Each mod comes in an archive of its
  own, from the releases of its project.
- Until the first release, 1.0.0, these files exist only as development
  builds, such as
  `https://github.com/enshwick/enshwick/releases/download/dev/enshwick.zip`.
  Every new build replaces that file.
- Download the files once and keep them in your own storage, such as a bucket
  or the image's build context. Then each rebuild of the image gets the same
  files.
- Pin each archive by its SHA-256. GitHub shows it beside every release file.
  Then the image holds exactly the file you checked.

This template takes the archive from the build context. Set every `<...>`
yourself:

```dockerfile
FROM alpine:<version> AS enshwick
RUN apk add --no-cache unzip
ARG ENSHWICK_SHA256=<the archive's SHA-256>
WORKDIR /enshwick
COPY enshwick.zip ./
RUN echo "$ENSHWICK_SHA256  enshwick.zip" | sha256sum -c - \
 && unzip -q enshwick.zip -d files

FROM <your Enshrouded server image>
COPY --from=enshwick /enshwick/files/ <folder that holds enshrouded_server.exe>/
```

Mods of other authors take the same steps with their own release links.

## Change versions by rolling out

A new version is a new image or a new volume. Roll it out like any other
change. Never change files inside a running container: the next restart starts
a set nobody built, and replicas drift apart.

## Keep the server running after a game update

After a game update, Enshwick may lack the table for the new game build. It then
finds what it needs by code patterns, and only what they miss stays off. With
`build_patterns = false` in `mod-configs/enshwick.toml`, such a build runs
without mods instead.

Enshwick saves what the patterns found in
`mod-data/enshwick/carried-server.txt`. It reads the file back while the game
and Enshwick stay the same, so only the first start after an update searches.
Keep `mod-data` on a volume to keep that file.

Rebuild the image once a newer Enshwick has the table for the build.

## Move a world to another folder

Mods keep each world's data in `mod-data/<mod id>/worlds/<key>/`. The key holds
a hash of the save's folder, such as `world0-1a2b3c4d`. A world whose save moves
to another folder gets a new key, such as a hosted world brought to a dedicated
server.

Enshwick finds the old data by itself. A world may load with a save but no mod
data under its key. When one other key of the same save name has data,
Enshwick takes that data over.

Enshwick moves the folders when the old save is gone. It copies them when the
old save is still there. The log says which of the two it did.

When two or more keys of the same save name have data, Enshwick moves nothing.
The log and the status summary list those keys. Stop the server, then rename
the right folder in each `mod-data/<mod id>/worlds/` to the new key.

The log names the new key in a line such as `world key <key>, from <path>`.

## Check what a server loaded

At every start, Enshwick writes `mods/enshwick/enshwick.lock`. It lists the
version and SHA-256 of Enshwick, and the game build. It also lists each running
mod's id, version, file and SHA-256.

Compare the file with the lock of a server you trust, or with the hashes of the
files you put in. Then you know that a pod runs exactly the image you meant.

## Greet players when they join

Set `motd` in `mod-configs/enshwick.toml` to a message of the day. Every player
reads it in chat when they join:

```toml
motd = """
Welcome to Ember Vale.
Restarts at 06:00 UTC. Rules: discord.gg/example
"""
```

The message is plain text. Enshwick keeps the first 4 lines and 500 bytes, and
it drops empty lines and control characters. The log warns when Enshwick cuts
the text.

A change applies at the next join, without a restart.

## Use mods from Nexus

Nexus downloads need a login, and its API needs a Premium account. So no build
or server automation can fetch them. Download such a mod once yourself, keep
the file in your own storage, and put it into the image from there, by version.

## Run the server on a Linux host

A Linux image runs the Windows server under Proton. Use GE-Proton or Valve's
Proton, pinned by version and run outside Steam. Plain Wine works too, but
Proton carries the fixes games need first.

[Run a server on Linux](/guides/run-a-linux-server/) shows the settings, such as
`WINEDLLOVERRIDES`. With a container CPU limit, the
[Optimizer](/mods/optimizer/) starts no more task workers than the limit allows.
