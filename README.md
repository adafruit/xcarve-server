# Raspberry Pi XCarve Server
A Node.js Raspberry Pi server for controlling a XCarve from a remote machine using [Easel](http://easel.inventables.com).

For detailed install instructions, please visit the tutorial on the [Adafruit Learning System](https://learn.adafruit.com/control-an-xcarve-cnc-machine-wirelessly-with-a-raspberry-pi).

## Connecting to a Headless Raspberry Pi

If you would like to connect to a headless Raspberry Pi for setting up WiFi access, you can use the
[Adafruit Raspberry Pi Finder][4] app to find and connect to your Raspberry Pi.

## Installation

Make sure you have the latest 4.x  version of Node.js installed on your Raspberry Pi. You can install it
using the [NodeSource][3] installer.

```console
pi@xcarve ~ $ curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
pi@xcarve ~ $ sudo apt-get install -y nodejs
pi@xcarve ~ $ node -v
v4.6.2
```

Make sure the global `node_modules` folder on your Raspberry Pi is writable by the `pi` user by running the following commands.

```console
pi@xcarve:~ $ mkdir ~/.npm-global
pi@xcarve:~ $ npm config set prefix '~/.npm-global'
pi@xcarve:~ $ echo "export PATH=~/.npm-global/bin:$PATH" >> ~/.bashrc
pi@xcarve:~ $ source ~/.bashrc
```

Install `xcarve-server` & `pm2` on your Raspberry Pi.

```console
pi@xcarve ~ $ npm install -g xcarve-server pm2
```

## Starting the Server

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

## Starting the Server on Boot

Run the following command to enable `pm2` startup on boot.

```console
pi@xcarve:~ $ sudo pm2 startup systemd
```

Tell `pm2` to save the current `xcarve-server` process. This will enable `xcarve-server` on boot.
```console
pi@xcarve:~ $ pm2 save
```

## Stopping the Server

```console
pi@xcarve ~ $ xcarve-server stop
stopping service...
```


## License

Some of the code included in the `lib/` folder of this repo was extracted from
[v0.2.7 of the Easel local OS X installer][1].

All other code is Copyright (c) 2015-2016 Adafruit Industries. Licensed under the MIT license.

Adafruit invests time and resources providing this open source code,
please support Adafruit and open-source hardware by purchasing products
from [Adafruit][2]!

[1]: http://easel.inventables.com/downloads
[2]: https://adafruit.com
[3]: https://github.com/nodesource/distributions
[4]: https://learn.adafruit.com/the-adafruit-raspberry-pi-finder
