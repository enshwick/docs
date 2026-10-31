---
title: Run a server on Linux
description: Run the Enshrouded dedicated server with Enshwick under Proton, and tune Linux so the server runs fast.
type: how-to
sidebar:
  order: 7
---

The Enshrouded dedicated server exists for Windows only. A Linux host runs it
under Proton. The settings on this page remove most of the time Proton adds.

## Install the server with Enshwick

1. Install the dedicated server with SteamCMD, app `2278520`.
2. [Install Enshwick](/guides/install/) into the folder that holds
   `enshrouded_server.exe`.
3. Start the server through Proton with `WINEDLLOVERRIDES="powrprof=n,b"` in its
   environment. Proton then loads the `powrprof.dll` of Enshwick.

## Use a kernel with ntsync

Run Linux 6.14 or newer with the `ntsync` module loaded. Proton 11 and GE-Proton
11 use it without extra settings. With it, the waits between game threads take
much less time.

1. Load the module: `sudo modprobe ntsync`.
2. Check that `/dev/ntsync` exists.
3. In a container, pass the device through, such as `--device /dev/ntsync` for
   Docker.

## Turn off Wine's debug output

Set `WINEDEBUG=-all` in the server's environment. Wine then writes no debug
lines. These lines cost time on a busy server.

## Keep the server on the same cores

Give the server its own CPU cores, so that other programs do not move it between
cores.

- With systemd, set `CPUAffinity=` in the service's unit.
- With Docker, use `--cpuset-cpus`.
- Without either, start the server with `taskset -c <cores>`.

`WINE_CPU_TOPOLOGY` sets which cores the game sees. Use it when the game must
see fewer cores than the host has.

## Let the CPU run at full speed

Set the CPU frequency governor to `performance`, so that the cores do not slow
down between busy moments: `sudo cpupower frequency-set -g performance`.

## Check the result

At start, the [Optimizer](/mods/optimizer/) mod writes one line into
`logs/enshwick/mods/enshwick.optimizer.log`. The line names the Wine version,
the kernel, the fast waits it found, the governor and the CPUs the game saw.

With ntsync in place, it reads `/dev/ntsync present`. Each missing setting gets
a line of advice.

For a server in Docker or Kubernetes, see
[Run a server in Docker or Kubernetes](/guides/run-a-server-in-docker/).
