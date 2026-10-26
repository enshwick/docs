---
title: Run a server on Linux
description: Run the Enshrouded dedicated server with enshwick under Proton, and tune Linux so it keeps up.
type: how-to
sidebar:
  order: 7
---

The Enshrouded dedicated server exists for Windows only, so a Linux host runs it
under Proton. These settings remove most of the time Proton adds.

## Install the server with enshwick

1. Install the dedicated server with SteamCMD, app `2278520`.
2. [Install enshwick](/guides/install/) into the folder that holds
   `enshrouded_server.exe`.
3. Start the server through Proton with `WINEDLLOVERRIDES="powrprof=n,b"` in its
   environment, so Proton loads enshwick's `powrprof.dll`.

## Use a kernel with ntsync

Run Linux 6.14 or newer with the `ntsync` module loaded. Proton 11 and GE-Proton
11 use it on their own. It makes the waits between game threads much cheaper.

1. Load the module: `sudo modprobe ntsync`.
2. Check that `/dev/ntsync` exists.
3. In a container, pass the device through, such as `--device /dev/ntsync` for
   Docker.

## Turn off Wine's debug output

Set `WINEDEBUG=-all` in the server's environment. Wine then writes no debug
lines, which cost time on a busy server.

## Keep the server on the same cores

Give the server its own CPU cores, so other work does not move it around.

- With systemd, set `CPUAffinity=` in the service's unit.
- With Docker, use `--cpuset-cpus`.
- Without either, start the server with `taskset -c <cores>`.

`WINE_CPU_TOPOLOGY` tells Proton which cores the game sees, when you want it to
see fewer than the host has.

## Let the CPU run at full speed

Set the CPU frequency governor to `performance`, so the cores do not slow down
between busy moments: `sudo cpupower frequency-set -g performance`.

## Check the result

At start, the Optimizer mod writes one line into
`logs/enshwick/mods/optimizer.log`. It names the Wine version and the kernel,
the fast waits it found, the governor and the CPUs the game saw. With ntsync in place it reads
`/dev/ntsync present`. Each missing setting gets a line of advice.

For a server in Docker or Kubernetes, see
[Running a server in Docker or Kubernetes](/dev/servers/).
