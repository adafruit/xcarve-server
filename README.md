# Raspberry Pi XCarve Server
A Node.js Raspberry Pi server for controlling an attached XCarve from a remote machine.

## Connecting to a Headless Raspberry Pi

If you would like to connect to a headless Raspberry Pi for setting up WiFi access, you can use the
[Adafruit Raspberry Pi Finder](https://learn.adafruit.com/the-adafruit-raspberry-pi-finder) app to find and
connect to your Raspberry Pi.

## Installation

Make sure you have the latest stable version of Node.js installed on your Raspberry Pi. You can download
it from the [node-arm](http://node-arm.herokuapp.com/) project.

```
pi@xcarve ~ $ node -v
v0.12.6
```

Make sure the global `node_modules` folder on your Raspberry Pi is writable by the `pi` user.

```
pi@xcarve ~ $ chown -R pi /usr/local
```

Install `forever-service` and `xcarve-server` on your Raspberry Pi.

```
pi@xcarve ~ $ npm install -g forever-service xcarve-server
```

## Starting the Service

If everything has been installed, you can start the service by running the following command:

```
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

```
pi@xcarve ~ $ xcarve-server stop
stopping service...
```
