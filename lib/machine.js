// this file is part of the v0.2.7 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var fs       = require('fs')
  , readline = require('readline')
  , Debugger = require('./debugger')
  , interval = require('./interval')
  , eventDispatcher = require('./event_dispatcher');


var Machine = function(port) {
  var that = {};

  var MAX_BYTES = 127;

  var logger  = Debugger.logger("Machine");

  var queuedGcodeCommands;   // Commands from gcode waiting to go to the machine
  var queuedConsoleCommands; // Commands from sendInstruction waiting to go to the machine
  var bufferedCommands;      // Commands in the machine's buffer
  var lastRunCommand;        // Last command completed by the machine
  var completedCommandCount;
  var isRunning = false;
  var isStopping = false;
  var isMachineConnected = false;
  var machineIdentification = null;
  var currentPosition = null;
  var startRunTime = null;

  var config = null;

  var runState = 'RUNNING';

  var heartbeat = interval(function() {
    sendInstruction('status');
  });

  var startHeartbeat = function() {
    heartbeat.start(500);
  };

  var stopHeartbeat = function() {
    heartbeat.stop();
  };

  var gcodeFor = function(instruction) {
    var gcode = config.gcode[instruction];
    if (gcode && gcode.indexOf('\\u') !== -1) {
      gcode = String.fromCharCode(gcode.replace('\\u', ''));
    }
    return gcode;
  };

  var byteCount = function(s) {
    return encodeURI(s).split(/%..|./).length - 1;
  };

  var init = function() {
    port.addEventListener('portOpened', onPortOpened);
    port.parser().addEventListener('ok', onProcessCommand);
    port.parser().addEventListener('ready', onMachineConnected);
    port.parser().addEventListener('status', onStatus);
    port.parser().addEventListener('position', onPosition);
    port.parser().addEventListener('probe-status', onReceiveProbeStatus);
    port.parser().addEventListener('probe-result', onReceiveProbeResult);
    port.parser().addEventListener('settings', onSettings);
    port.parser().addEventListener('grbl-alarm', onGrblAlarm);
    port.parser().addEventListener('grbl-error', onGrblError);
    port.parser().addEventListener('machine-type', onReceiveMachineType);
    port.parser().addEventListener('serial-number', onReceiveSerialNumber);

    port.addEventListener("close", portClosed);
  };

  var onGrblAlarm = function (message) {
    that.dispatchEvent('grbl-alarm', message);
  };

  var onGrblError = function (message) {
    that.dispatchEvent('grbl-error', message);
  };

  var onReceiveMachineType = function(machineType) {
    that.dispatchEvent('machine-type', machineType);
  };

  var onReceiveProbeStatus = function(probeStatus) {
    that.dispatchEvent('probe-status', probeStatus);
  };

  var onReceiveProbeResult = function(probeResult) {
    that.dispatchEvent('probe-result', probeResult);
  };

  var onReceiveSerialNumber = function(serialNumber) {
    that.dispatchEvent('serial-number', serialNumber);
  };

  var getMachineIdentification = function() {
    if (isMachineConnected) {
      return machineIdentification;
    } else {
      return null;
    }
  };

  var onPortOpened = function() {
    sendInstruction('flush');
  };

  var onMachineConnected = function(identification) {
    machineIdentification = identification;
    isMachineConnected = true;
    startHeartbeat();
    sendInstruction('readSerialNumber');
    that.dispatchEvent('connected');
  };

  var statusTransitions = {
    'PAUSING': {
      'hold': 'PAUSED',
      'door': 'PAUSED_DOOR_OPEN'
    },
    'PAUSED': {
      'run': 'RUNNING',
      'door': 'PAUSED_DOOR_OPEN'
    },
    'PAUSED_DOOR_OPEN': {
      'hold': 'PAUSED',
      'run': 'RUNNING'
    },
    'RESUMING': {
      'run': 'RUNNING',
      'door': 'PAUSED_DOOR_OPEN'
    },
    'RUNNING': {
      'hold': 'PAUSED',
      'door': 'PAUSED_DOOR_OPEN'
    }
  };

  var actionTransitions = {
    'PAUSED': {
      'resume': 'RESUMING'
    },
    'RUNNING': {
      'pause': 'PAUSING'
    },
    'PAUSING': {
      'resume': 'RESUMING'
    },
    'PAUSED_DOOR_OPEN': {},
    'RESUMING': {
      'pause': 'PAUSING'
    }
  };

  var runStateEnteredCallbacks = function() {
    return {
      'PAUSING': paused,
      'PAUSED_DOOR_OPEN': paused,
      'PAUSED': paused,
      'RESUMING': resumed,
      'RUNNING': resumed
    }
  };

  var onStatus = function(status) {
    if (isRunning) {
      transitionRunState(status, statusTransitions);
    }

    that.dispatchEvent('status', status);
  };

  var onPosition = function(position) {
    currentPosition = position;
    that.dispatchEvent('position', position);
  };

  var ready = function() {
    that.dispatchEvent('ready');
  };

  var requestSettings = function() {
    sendInstruction('settings');
  };

  var onSettings = function(data) {
    that.dispatchEvent('settings', data);
  };

  var streamGcodeLines = function(lines) {
    queuedGcodeCommands = lines;
    isRunning = true;
    runState = 'RUNNING'; // TODO bring this under the easelAction umbrella
    completedCommandCount = 0;
    startRunTime = Date.now();
    reportJobStatus();
    fillCommandBuffer();
  };

  var nextCommand = function() {
    if (queuedConsoleCommands.length > 0) {
      return queuedConsoleCommands[0];
    } else if (isRunning && runState === 'RUNNING' && queuedGcodeCommands.length > 0) {
      return queuedGcodeCommands[0];
    } else {
      return null;
    }
  };

  var dequeueNextCommand = function() {
    if (queuedConsoleCommands.length > 0) {
      return queuedConsoleCommands.shift();
    } else if (queuedGcodeCommands.length > 0) {
      return queuedGcodeCommands.shift();
    }
  };

  var roomInBufferForNextCommand = function() {
    var potentialBufferedCommands = bufferedCommands.concat([nextCommand()]);
    var bytes = byteCount(potentialBufferedCommands.join('\n') + '\n');

    return bytes <= MAX_BYTES;
  };

  var sendLine = function(line) {
    port.write(line + '\n');
  };

  var fillCommandBuffer = function() {
    while (nextCommand() && roomInBufferForNextCommand()) {
      var line = dequeueNextCommand();
      bufferedCommands.push(line);
      sendLine(line);
    }
  };

  var unprocessedCommandCount = function() {
    return bufferedCommands.length + queuedConsoleCommands.length + queuedGcodeCommands.length;
  };

  var percentComplete = function() {
    return completedCommandCount / (completedCommandCount + unprocessedCommandCount()) * 100;
  };

  var onProcessCommand = function() {
    lastRunCommand = bufferedCommands.shift();
    completedCommandCount++;
    fillCommandBuffer();

    if (isRunning && runState === 'RUNNING') {
      reportJobStatus();
      if (unprocessedCommandCount() === 0) {
        isRunning = false;
        reportRunTime();
      }
    }
  };

  var currentState = function() {
    return {
      completedCommandCount: completedCommandCount,
      pendingCommandCount: queuedConsoleCommands.length + queuedGcodeCommands.length,
      lastCommand: lastRunCommand,
      machineBuffer: bufferedCommands,
      running: isRunning,
      paused: runState === 'PAUSED',
      stopping: isStopping
    };
  };

  var portClosed = function() {
    stopHeartbeat();
    isMachineConnected = false;
    reportRunTime();
    that.dispatchEvent('port_lost', error("Machine disconnected"));
    reset();
  };

  // Socket connection to Easel lost
  var disconnect = function() {
    stopHeartbeat();
    port.close();
    isMachineConnected = false;
    reset();
  };

  var error = function(message) {
    return {
      completed_command_count: completedCommandCount,
      pending_command_count: queuedConsoleCommands.length + queuedGcodeCommands.length,
      current_position: currentPosition,
      last_instruction: lastRunCommand,
      active_buffer: bufferedCommands,
      sender_note: message
    }
  };

  var reset = function() {
    logger.log("Resetting");
    isRunning = false;
    runState = 'RUNNING';
    resetQueue();
    completedCommandCount = 0;
  };

  var resetQueue = function() {
    queuedGcodeCommands = [];
    queuedConsoleCommands = [];
    bufferedCommands = [];
  };

  var running = function() {
    that.dispatchEvent("progress", percentComplete());
  };

  var reportJobStatus = function() {
    if (isRunning) {
      // Unified run-state reporting
      reportRunState();

      // For API compatibility, collapse intermediate pausing / resuming states
      switch (runState) {
        case 'RUNNING':
        case 'RESUMING':
          running();
          break;
        case 'PAUSED':
        case 'PAUSING':
        case 'PAUSING_DOOR_OPEN':
          paused();
          break;
      }
    } else if (isStopping) {
      stopping();
    } else if (isMachineConnected) {
      ready();
    }
  };

  var reportRunState = function() {
    that.dispatchEvent("run-state", runState);
  };

  var reportRunTime = function() {
    if (startRunTime !== null) {
      that.dispatchEvent('run-time', {start: startRunTime, end: Date.now()});
      startRunTime = null;
    }
  };

  var pause = function() {
    sendInstruction('pause');
    easelAction('pause');
  };

  var paused = function() {
    that.dispatchEvent("paused", percentComplete());
  };

  var resume = function() {
    sendInstruction('resume');
    easelAction('resume');
  };

  var resumed = function() {
    fillCommandBuffer();
    that.dispatchEvent("resumed", percentComplete());
  };

  var enteredRunState = function(state) {
    if (runStateEnteredCallbacks()[state]) {
      runStateEnteredCallbacks()[state]();
    }
  };

  var transitionRunState = function(action, transitions) {
    var nextState = transitions[runState][action];

    if (nextState) {
      if (isRunning && runState === 'RUNNING') {
        reportRunTime();
      } else if (isRunning && nextState === 'RUNNING') {
        startRunTime = Date.now();
      }
      runState = nextState;
      enteredRunState(runState);
    }
  };

  var easelAction = function(action) {
    transitionRunState(action, actionTransitions);
  };

  var REAL_TIME_COMMANDS = { pause: true, resume: true, flush: true, status: true };

  var sendInstruction = function(instruction) {
    if (instruction === 'flush') {
      resetQueue();
    }
    var gcode = gcodeFor(instruction);
    if (REAL_TIME_COMMANDS[instruction]) {
      port.write(gcode);
    } else if (gcode !== undefined) {
      enqueueCommand(gcode);
    }
  };

  var enqueueCommand = function(line) {
    queuedConsoleCommands.push(line);
    fillCommandBuffer();
  };

  var stop = function(params) {
    if (isRunning) {
      isStopping = true;
      stopping();
      reset();
      sendInstruction('pause');
      setTimeout(function() {
        sendInstruction('flush');
        setTimeout(function() {
          sendInstruction('resume');
          setTimeout(function() {
            sendInstruction('liftToSafeHeight');
            sendInstruction('spindleOff');
            sendInstruction('park');
            isStopping = false;
            reportJobStatus();
          }, 1000);
        }, 1000);
      }, 1000);
    }
  };

  var execute = function(instructions) {
    instructions.forEach(function(instruction) {
      sendInstruction(instruction);
    });
  };

  var stopping = function() {
    that.dispatchEvent("stopping");
  };

  var acquire = function(timestamp) {
    if (!isRunning) {
      that.dispatchEvent("release", timestamp);
    };
  };

  var setConfig = function(_config) {
    config = _config;
  };

  that.getMachineIdentification = getMachineIdentification;
  that.requestSettings = requestSettings;
  that.currentState = currentState;
  that.streamGcodeLines = streamGcodeLines;
  that.enqueueCommand = enqueueCommand;
  that.disconnect = disconnect;
  that.reportJobStatus = reportJobStatus;
  that.pause = pause;
  that.resume = resume;
  that.stop = stop;
  that.acquire = acquire;
  that.setConfig = setConfig;
  that.execute = execute;

  init();
  reset();
  eventDispatcher(that);

  return that;
};

module.exports = Machine;
