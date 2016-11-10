// this file is part of the v0.2.7 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var Machine = require('./machine')
  , SerialPortController = require('./serial_port_controller')
  , path     = require('path')
  , Debugger = require('./debugger')
  , power = require('onoff').Gpio(17, 'out') , fs = require('fs'); var WebsocketController = function(sockets, version, abilities) { var that = {};
  var logger = Debugger.logger("Websocket Controller");
  var connectedClients = 0;
  var serialPortController = new SerialPortController();
  var machine = Machine(serialPortController);
  var minimumTimeBetweenUpdates = 500;
  var lastUpdateTime = Date.now();
  var config = null;
  var projectName = "Unknown";
  var echoEnabled = false;

  var setUpSerialPortListeners = function() {
    var echo = function(params) {
      if (echoEnabled) {
        sockets.emit('echo', params);
      }
    };

    serialPortController.addEventListener('write', function(data) {
      echo({ action: 'write', data: data });
    });

    serialPortController.addEventListener('read', function(data) {
      echo({ action: 'read', data: data });
    });

    serialPortController.addEventListener('portOpened', function() {
      echo({ action: 'portOpened' });
    });

    serialPortController.addEventListener('close', function() {
      echo({ action: 'close' });
    });
  };

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

    machine.addEventListener('error', function(d) {
      sockets.emit('error', d);
    });

    machine.addEventListener('port_lost', function(data) {
      sockets.emit('port_lost', data);
    });

    machine.addEventListener('position', function(position) {
      sockets.emit('position', position);
    });

    machine.addEventListener('probe-status', function(probeStatus) {
      sockets.emit('probe-status', probeStatus);
    });

    machine.addEventListener('probe-result', function(probeResult) {
      sockets.emit('probe-result', probeResult);
    });

    machine.addEventListener('status', function(status) {
      sockets.emit('state', status);
    });

    machine.addEventListener('run-state', function(state) {
      sockets.emit('run-state', state);
    });

    machine.addEventListener('settings', function(settings) {
      sockets.emit('machine-settings', settings);
    });

    machine.addEventListener('machine-type', function(machineType) {
      sockets.emit('machine-type', machineType);
    });

    machine.addEventListener('serial-number', function(serialNumber) {
      sockets.emit('serial-number', serialNumber);
    });

    machine.addEventListener('run-time', function(runTime) {
      sockets.emit('run-time', runTime);
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

  setUpSerialPortListeners();
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

  var onRequestMachineSettings = function() {
    machine.requestSettings();
  };

  var onGetPorts = function() {
    serialPortController.listPorts(function (ports) {

      ports.forEach(function(p) {
        if(/Arduino/gi.test(p.manufacturer)) comName = p.comName;
      });

      sockets.emit('ports', ports);
    });
  };

  var onConsole = function(line) {
    machine.enqueueCommand(line);
  };

  var onRequestSenderState = function() {
    if (machine) {
      socket.emit('iris-state', machine.currentState());
    } else {
      socket.emit('iris-state', 'offline');
    }
  };

  var onSetConfig = function(_config) {
    config = _config;
    logger.log('Setting config: ' + config.name);
    machine.disconnect();
    machine.setConfig(config);
  };

  var onDisconnect = function() {
    connectedClients -= 1;
    if (connectedClients === 0) {
      machine.stop();
      setTimeout(function() {
        if (connectedClients === 0) {
          machine.disconnect();
          // turn off power
          setTimeout(function() {
            power.writeSync(0);
          }, 2000);
        }
      }, 10000);
    }
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

  var onInitPort = function(comName) {
    if (config === null) {
      logger.log('ERROR: trying to connect without setting a configuration!');
      return;
    }

    logger.log("Opening port: " + comName); serialPortController.initPortWithConfigs(comName, config);
  };

  var onSetEcho = function(enabled) {
    echoEnabled = enabled;
  };

  sockets.on('connection', function(socket) {

    // turn on powerswitchtail
    power.writeSync(1);

    socket.emit('version', version);
    socket.emit('abilities', abilities);

    socket.on('get_connection', reportConnectionStatus);
    socket.on('get_job_status', reportJobStatus);
    socket.on('gcode', onGcode);
    socket.on('get_ports', onGetPorts);
    socket.on('console', onConsole);
    socket.on('execute', onExecute);
    socket.on('state', onRequestSenderState);
    socket.on('set_config', onSetConfig);
    socket.on('disconnect', onDisconnect);
    socket.on('init_port', onInitPort);
    socket.on('pause', onPause);
    socket.on('acquire', onAcquire);
    socket.on('resume', onResume);
    socket.on('stop', onStop);
    socket.on('echo', onSetEcho);
    socket.on('machine-settings', onRequestMachineSettings);
    socket.on('sent_feedback', function() { socket.broadcast.emit("sent_feedback"); });

    connectedClients += 1;
  });

  return that;
};

module.exports = WebsocketController;
