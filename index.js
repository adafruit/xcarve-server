// this file is a modified version of the v0.2.1 easel local OS X
// install. you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var io       = require('socket.io')
  , http     = require('http')
  , WebsocketController  = require('./lib/websocket_controller')
  , fs = require('fs')
  , path = require('path');

var WEBSOCKET_PORT = 1338;

var app = http.createServer()
io = io.listen(app);

var origins = "easel.inventables.com:80 easel.inventables.com:443"
io.origins(origins);

app.listen(WEBSOCKET_PORT, '0.0.0.0');

var websocketController = new WebsocketController(io.sockets, '0.2.1');
