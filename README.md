# Raspberry Pi XCarve Server

A Node.js Raspberry Pi server for controlling a XCarve from a remote machine using [Easel](http://easel.inventables.com).
For detailed install instructions, please visit the tutorial on the [Adafruit Learning System](https://learn.adafruit.com/control-an-xcarve-wirelessly).

## Connecting to a Headless Raspberry Pi

If you would like to connect to a headless Raspberry Pi for setting up WiFi access, you can use the
[Adafruit Raspberry Pi Finder][4] app to find and connect to your Raspberry Pi.

## Installation

Make sure you have the latest stable version of Node.js installed on your Raspberry Pi. You can download
it from the [node-arm][3] project.

```console
pi@xcarve ~ $ node -v
v0.12.6
```

Make sure the global `node_modules` folder on your Raspberry Pi is writable by the `pi` user.

```console
pi@xcarve ~ $ sudo chown -R pi /usr/local
```

Install `forever-service` and `xcarve-server` on your Raspberry Pi.

```console
pi@xcarve ~ $ npm install -g forever-service xcarve-server
```

## Starting the Service

If everything has been installed, you can start the service by running the following command:

```console
pi@xcarve ~ $ xcarve-server start

██╗  ██╗      ██████╗ █████╗ ██████╗ ██╗   ██╗███████╗
╚██╗██╔╝     ██╔════╝██╔══██╗██╔══██╗██║   ██║██╔════╝
 ╚███╔╝█████╗██║     ███████║██████╔╝██║   ██║█████╗
 ██╔██╗╚════╝██║     ██╔══██║██╔══██╗╚██╗ ██╔╝██╔══╝
██╔╝ ██╗     ╚██████╗██║  ██║██║  ██║ ╚████╔╝ ███████╗
╚═╝  ╚═╝      ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝

starting service on port 1338...
```

## Stopping the Service

```console
pi@xcarve ~ $ xcarve-server stop
stopping service...
```

## License

Some of the code included in the `lib/` folder of this repo was extracted from
[v0.2.1 of the Easel local OS X installer][1].

All other code is Copyright (c) 2015 Adafruit Industries. Licensed under the MIT license.

Adafruit invests time and resources providing this open source code,
please support Adafruit and open-source hardware by purchasing products
from [Adafruit][2]!

[1]: http://s3.amazonaws.com/easel-prod/paperclip/sender_version_mac_installers/10/original/Easel_Local_v0.2.1.pkg?1435076999
[2]: https://adafruit.com
[3]: http://node-arm.herokuapp.com
[4]: https://learn.adafruit.com/the-adafruit-raspberry-pi-finder
