---
title: Run a server in Docker or Kubernetes
description: Put Enshwick and its mods into a dedicated server image in Docker or Kubernetes. Roll out new versions, move worlds and check what each server loaded.
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
- Until the first release, 1.0.0, these files come as alphas, such as
  [the newest enshwick.zip](https://github.com/enshwick/enshwick/releases/latest/download/enshwick.zip).
  Each alpha has its own version and its own files. Anything may change from
  one alpha to the next, so roll out a new alpha on a copy of a world first.
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

After a game update, Enshwick finds what it needs on the new game build the same
way as on every build: by its engine routes and code patterns. Only what they
miss stays off. With `build_patterns = false` in `enshwick.toml` in the game
folder, a build that no compatibility report of your Enshwick release covers runs
without mods instead.

Rebuild the image once a newer Enshwick reports the build or finds what was
missing.

## Keep worlds on a volume

Mods keep each world's settings and data beside its save, in folders such as
`world0-mod-settings` and `world0-mod-data` next to `world0.ksd`. Put the
server's `savegame` folder on a volume, and the world keeps its mod data across
rollouts.

To move a world to another server, copy the save with its two folders. A
hosted world comes along the same way: copy it from the player's save folder
into the server's `savegame`.

[Where files live](/reference/where-files-live/) lists the folders.

## Check what a server loaded

At every world load, Enshwick writes `mods.lock` into that world's
`world0-mod-data/enshwick/`. It lists the version and SHA-256 of Enshwick, and
the game build. It also lists each running mod's id, version, folder and
SHA-256.

What changed since the world last loaded goes to the log.

Compare the file with the lock of a server you trust, or with the hashes of the
files you put in. Then you know that a pod runs exactly the image you meant.

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
