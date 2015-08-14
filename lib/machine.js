var _        = require('underscore')._
  , fs       = require('fs')
  , readline = require('readline')
  , Debugger = require('./debugger')
  , interval = require('./interval')
  , onoff = require('onoff')
  , eventDispatcher = require('./event_dispatcher');


var Machine = function(port) {
  var that = {};

  var MAX_BYTES = 127;

  var logger  = Debugger.logger("Machine");

  var commandStack;      // Commands waiting to go to the machine
  var sentCommands;      // Commands in the machine's buffer
  var lastRunCommand;    // Last command completed by the machine
  var completedCommandCount;
  var isRunning = false;
  var isPaused = false;
  var isStopping = false;
  var isMachineConnected = false;
  var machineIdentification = null;
  var currentPosition = null;

  var config = null;

  var isGRBL = function() {
    return (config && config.name.indexOf('GRBL') !== -1);
  };

  var heartbeat = interval(function() {
    if (!isRunning || isGRBL()) {
      sendInstruction('status');
    }
  });

  var startHeartbeat = function() {
    logger.log('starting heartbeat');
    heartbeat.start(500);
  };

  var stopHeartbeat = function() {
    logger.log('stopping heartbeat');
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
    port.parser().addEventListener('ok', processedCommand);
    port.parser().addEventListener('ready', machineConnected);
    port.parser().addEventListener('state', state);
    port.parser().addEventListener('position', position);
    port.parser().addEventListener('settings', settings);
    port.parser().addEventListener('portOpened', portOpened);
    port.parser().addEventListener('grbl-alarm', onGrblAlarm);
    port.parser().addEventListener('grbl-error', onGrblError);

    port.addEventListener("close", portClosed);
  };

  var onGrblAlarm = function (message) {
    that.dispatchEvent('grbl-alarm', message);
  };

  var onGrblError = function (message) {
    that.dispatchEvent('grbl-error', message);
  };

  var getMachineIdentification = function() {
    if (isMachineConnected) {
      return machineIdentification;
    } else {
      return null;
    }
  };

  var portOpened = function() {
    logger.log('port opened! waiting for identifier');
  };

  var machineConnected = function(identification) {
    machineIdentification = identification;
    isMachineConnected = true;
    startHeartbeat();
    that.dispatchEvent('connected');
  };

  var state = function(state) {
    that.dispatchEvent('state', state);
  };

  var position = function(position) {
    currentPosition = position;
    that.dispatchEvent('position', position);
  };

  var ready = function() {
    that.dispatchEvent('ready');
  };

  var requestSettings = function() {
    sendInstruction('settings');
  };

  var settings = function(data) {
    logger.log("machine settings: " + data);
    that.dispatchEvent('settings', data);
  };

  var streamGcodeLines = function(lines) {
    reset();
    commandStack = lines.reverse()
    isRunning = true;
    reportJobStatus();
    fillCommandBuffer();
  };

  var clearStack = function() {
    commandStack = [];
  };

  var nextCommand = function() {
    if (commandStack.length > 0) {
      return commandStack[commandStack.length - 1];
    } else {
      return null;
    }
  };

  var roomInBufferForNextCommand = function() {
    var buffer = sentCommands.join("\n") + "\n";
    var bytes = byteCount(buffer + nextCommand() + "\n");

    return bytes <= MAX_BYTES;
  };

  var popNextCommand = function() {
    return commandStack.pop();
  };

  var sendLine = function(line) {
    port.write(line + '\n');
  };

  var fillCommandBuffer = function() {
    while (nextCommand() && roomInBufferForNextCommand()) {
      var line = popNextCommand();
      sentCommands.unshift(line);
      logger.log('Sending line: ' + line);
      sendLine(line);
    }
  };

  var unprocessedCommandCount = function() {
    return sentCommands.length + commandStack.length;
  }

  var percentComplete = function() {
    return completedCommandCount / (completedCommandCount + unprocessedCommandCount()) * 100;
  };

  var processedCommand = function() {
    lastRunCommand = sentCommands.pop();
    completedCommandCount++;

    if (isRunning && !isPaused) {
      reportJobStatus();
      if (unprocessedCommandCount() == 0) {
        isRunning = false;
      } else {
        fillCommandBuffer();
      }
    }
  };

  var currentState = function() {
    return {
      completedCommandCount: completedCommandCount,
      pendingCommandCount: commandStack.length,
      lastCommand: lastRunCommand,
      machineBuffer: sentCommands.concat([]).reverse(), // reverse this thing to return the oldest commands first
      running: isRunning,
      paused: isPaused,
      stopping: isStopping
    };
  };

  var portClosed = function() {
    isMachineConnected = false;
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
      pending_command_count: commandStack.length,
      current_position: currentPosition,
      active_buffer: sentCommands.concat([]).reverse(), // reverse this thing to return the oldest commands first
      last_instruction: lastRunCommand,
      sender_note: message
    }
  };

  var reset = function() {
    logger.log("Resetting");
    isRunning = false;
    isPaused = false;
    commandStack = [];
    sentCommands = [];
    completedCommandCount = 0;
  };

  var running = function() {
    that.dispatchEvent("progress", percentComplete());
  };

  var reportJobStatus = function() {
    if (isRunning) {
      if (isPaused) {
        paused();
      } else {
        running();
      }
    } else if (isStopping) {
      stopping();
    } else if (isMachineConnected) {
      ready();
    }
  };

  var pause = function() {
    if (isRunning) {
      isPaused = true;
      sendInstruction('pause')
      paused();
    }
  };

  var paused = function() {
    that.dispatchEvent("paused", percentComplete());
  };

  var resume = function() {
    if (isPaused) {
      isPaused = false;
      sendInstruction('resume');
      fillCommandBuffer();
      that.dispatchEvent("resumed", percentComplete());
    }
  };

  var sendInstruction = function(instruction) {
    var gcode = gcodeFor(instruction);
    if (gcode === '?') {
      port.write(gcode);
    } else if (gcode !== undefined) {
      sendLine(gcode);
    }
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
  that.sendLine = sendLine;
  that.clearStack = clearStack;
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
}

module.exports = Machine;
