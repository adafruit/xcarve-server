// this file is part of the v0.2.1 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var Machine = require('./machine')
  , SerialPortController = require('./serial_port_controller')
  , path     = require('path')
  , Debugger = require('./debugger')
  , power = require('onoff').Gpio(17, 'out')
  , fs = require('fs');


var WebsocketController = function(sockets, version) {
  var that = {};
  var logger = Debugger.logger("Websocket Controller");
  var connectedClients = 0;
  var sp_controller = new SerialPortController();
  var machine = Machine(sp_controller);
  var minimumTimeBetweenUpdates = 500;
  var lastUpdateTime = Date.now();
  var config = null;
  var projectName = "Unknown";

  var setUpMachineListeners = function() {
    machine.addEventListener('connected', function() {
      reportConnectionStatus();
    });

    machine.addEventListener('ready', function() {
      sockets.emit('ready');
    });

    machine.addEventListener('resumed', function(percentComplete) {
      sockets.emit('running', projectName, percentComplete);
    });

    machine.addEventListener('progress', function(percentComplete) {
      if (Date.now() - lastUpdateTime > minimumTimeBetweenUpdates || percentComplete === 100) {
        lastUpdateTime = Date.now();
        sockets.emit('running', projectName, percentComplete);
      }
    });

    machine.addEventListener('done', function() {
      sockets.emit('done');
    });

    machine.addEventListener('error', function(d) {
      sockets.emit('error', d);
    });

    machine.addEventListener('port_lost', function(data) {
      sockets.emit('port_lost', data);
    });

    machine.addEventListener('position', function(position) {
      sockets.emit('position', position);
    });

    machine.addEventListener('state', function(state) {
      sockets.emit('state', state);
    });

    machine.addEventListener('settings', function(settings) {
      sockets.emit('machine-settings', settings);
    });

    machine.addEventListener('paused', function(percentComplete) {
      sockets.emit('paused', projectName, percentComplete);
    });

    machine.addEventListener('release', function(timestamp) {
      sockets.emit('release', timestamp);
    });

    machine.addEventListener('stopping', function() {
      sockets.emit('stopping');
    });

    machine.addEventListener('grbl-error', function(message) {
      sockets.emit('grbl-error', message);
    });

    machine.addEventListener('grbl-alarm', function(message) {
      sockets.emit('grbl-alarm', message);
    });
  };

  setUpMachineListeners();

  var reportJobStatus = function() {
    machine.reportJobStatus();
  };

  var reportConnectionStatus = function() {
    sockets.emit('connection_status', machine.getMachineIdentification());
  };

  var onGcode = function(job) {
    var gcode = job.gcode;
    var lines = gcode.split('\n');
    projectName = job.name;
    if (!machine) {
      console.error("Machine not initialized");
    } else {
      logger.log('got ' + lines.length + ' lines of gcode');
      machine.streamGcodeLines(lines);
    }
  };

  var onMachineSettings = function() {
    machine.requestSettings();
  };

  var comName = '';

  var onGetPorts = function() {
    sp_controller.listPorts(function (ports) {

      ports.forEach(function(p) {
        if(/Arduino/gi.test(p.manufacturer)) comName = p.comName;
      });

      sockets.emit('ports', ports);

    });
  };

  var onConsole = function(line) {
    logger.log('sending line from console: '+line)
    // TODO : using machine protected function
    machine.sendLine(line);
  };

  var onSenderState = function() {
    if (machine) {
      socket.emit('iris-state', machine.currentState());
    } else {
      socket.emit('iris-state', 'offline');
    }
  };

  var onSetConfig = function(_config) {
    config = _config;

    logger.log('Setting config to: ' + config.name);
    machine.disconnect();

    logger.log("initing using config: " + config.name)
    machine.setConfig(config);
  };

  var onClear = function() {
    machine.clearStack();
  };

  var onDisconnect = function() {
    connectedClients -= 1;

    if (connectedClients !== 0)
      return;
      
    machine.disconnect();

    // turn off power
    setTimeout(function() {
      power.writeSync(0); 
    }, 2000);

  };

  var onPause = function() {
    machine.pause();
  };

  var onResume = function() {
    machine.resume();
  };

  var onAcquire = function(timestamp) {
    machine.acquire(timestamp);
  };

  var onStop = function(params) {
    machine.stop(params);
  };

  var onExecute = function(instructions) {
    machine.execute(instructions);
  };

  var onInitPort = function() {
    if (config === null) {
      logger.log('ERROR: trying to connect without setting a configuration!');
      return;
    }

    if(! comName) onGetPorts();

    logger.log("trying to init port: " + comName);
    sp_controller.initPortWithConfigs(comName, config);
  };

  sockets.on('connection', function(socket) {
 
    // turn on powerswitchtail
    power.writeSync(1);

    socket.emit('version', version);

    socket.on('get_connection', reportConnectionStatus);
    socket.on('get_job_status', reportJobStatus);
    socket.on('gcode', onGcode);
    socket.on('get_ports', onGetPorts);
    socket.on('console', onConsole);
    socket.on('execute', onExecute);
    socket.on('state', onSenderState);
    socket.on('set_config', onSetConfig)
    socket.on('disconnect', onDisconnect);
    socket.on('init_port', onInitPort);
    socket.on('pause', onPause);
    socket.on('acquire', onAcquire);
    socket.on('resume', onResume);
    socket.on('stop', onStop);
    socket.on('machine-settings', onMachineSettings);
    socket.on('sent_feedback', function() { socket.broadcast.emit("sent_feedback"); });

    connectedClients += 1;
  });

  return that;
};

module.exports = WebsocketController;
