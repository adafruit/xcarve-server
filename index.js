// this file is a modified version of the v0.2.7 easel local OS X
// install. you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com
var io       = require('socket.io')
  , http     = require('http')
  , WebsocketController  = require('./lib/websocket_controller')
  , fs = require('fs')
  , path = require('path')
  , Debugger = require('./lib/debugger');

var WEBSOCKET_PORT = process.argv[2] || 1338;

var logger = Debugger.logger('xcarve-server');

var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
var version = '0.2.7';
var iris = json.iris;

logger.log("Starting Easel Local " + version);

var app = http.createServer()
io = io.listen(app);

// TODO: Remove port 80 after SSL is enforced in production
var origins = process.argv[3] || "easel.inventables.com:80 easel.inventables.com:443 easelstaging.inventables.com:80 easelstaging.inventables.com:443"
io.origins(origins);

logger.log("Listening on port " + WEBSOCKET_PORT + " for connections from " + origins);

app.listen(WEBSOCKET_PORT, "0.0.0.0");

var websocketController = new WebsocketController(io.sockets, version, iris.abilities);
