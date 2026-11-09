---
title: Run a server on Linux
description: Run the Enshrouded dedicated server with Enshwick under Wine or Proton on Linux, in a hosting panel, and tune the kernel, Wine, CPU cores and clock.
type: how-to
sidebar:
  order: 7
---

The Enshrouded dedicated server exists for Windows only. A Linux host runs it
under Wine or Proton. Enshwick runs there with one environment variable.

The steps on this page ran on game build 26430253, under Wine 11.0 and
GE-Proton 11-9.

## Install the server with Enshwick

1. Install the dedicated server with SteamCMD, app `2278520`.
2. [Install Enshwick](/guides/install/) into the folder that holds
   `enshrouded_server.exe`.
3. Start the server under Wine or Proton with `WINEDLLOVERRIDES="powrprof=n,b"`
   in its environment. Wine and Proton then load the `powrprof.dll` of
   Enshwick.

Without this variable, Wine and Proton load their own `powrprof.dll`. The server
then starts without Enshwick and without mods.

A SteamCMD update with `validate` checks only the game's own files. It keeps
`powrprof.dll` and the `mods` folder.

## Add the variable when your host already sets one

`WINEDLLOVERRIDES` holds a list, separated by semicolons. If your host already
sets it, add `powrprof=n,b` to the end of the list.

For example, `dbghelp=n,b` becomes `dbghelp=n,b;powrprof=n,b`.

## Check that Enshwick started

Open the `logs` folder beside `enshrouded_server.exe`. Enshwick writes a log
named `enshwick_<date>_<time>.log` there at every start.

Its first line names the Enshwick version and the Wine version. A line such as
`ready: 1 of 1 mods running` follows. If there is no such log, the server did
not get the variable.

## Use a hosting panel

A panel starts the server with its own command. Put Enshwick's files into the
server's folder with the panel's file manager or SFTP, then add the variable.

- **Pelican or Pterodactyl**, with the Enshrouded egg: put the variable in
  front of the startup command. The command then begins with
  `WINEDLLOVERRIDES="powrprof=n,b" proton run`. An administrator changes it on
  the server's page in the admin area.
- **AMP**: its Enshrouded template sets `WINEDLLOVERRIDES` already. Add
  `powrprof=n,b` to that list, as in
  [Add the variable when your host already sets one](#add-the-variable-when-your-host-already-sets-one).

A rented server needs the same variable when it runs on Linux. If its host lets
you set neither the variable nor the startup command, Enshwick cannot start
there. A rented server on Windows needs no variable.

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
its log, `logs/enshwick.optimizer_<date>_<time>.log`. The line names the Wine version,
the kernel, the fast waits it found, the governor and the CPUs the game saw.

With ntsync in place, it reads `/dev/ntsync present`. Each missing setting gets
a line of advice.

For a server in Docker or Kubernetes, see
[Run a server in Docker or Kubernetes](/guides/run-a-server-in-docker/).
