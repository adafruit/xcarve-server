// this file is part of the v0.2.7 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var Debugger = require('./debugger')
  , eventDispatcher = require('./event_dispatcher');

var Parser = function(){

  var that = {};
  eventDispatcher(that);

  var logger  = Debugger.logger("Parser");

  var stringContains = function(str, matcher) {
    return str.indexOf(matcher) !== -1;
  };

  var stringContainsAtLeastOne = function(str, matchers) {
    for (var n = 0; n < matchers.length; n++) {
      if (stringContains(str, matchers[n])) {
        return true;
      }
    }
    return false;
  };

  var isGrblReport = function (d) {
    return d.match(/^<.*>$/);
  };

  var isGrblBuildInfo = function(d) {
    return d.match(/^\[.+:[\d-]+\]$/);
  };

  var isGrblSettings = function (d) {
    return d.match(/^\$\d+\s*=/);
  };

  var isGrblError = function (d) {
    return d.match(/error:(.*)/);
  };

  var isGrblAlarm = function (d) {
    return d.match(/ALARM:(.*)/);
  };

  var isGrblProbe = function (d) {
    return d.match(/\[PRB:.+/);
  };

  var parseData = function (d, config) {
    d = d.trim();
    if (stringContainsAtLeastOne(d, config.readyResponses)) {
      that.dispatchEvent('ready', d);
    } else if (stringContains(d, config.successResponse)) {
      that.dispatchEvent('ok', d);
    } else if (isGrblReport(d)) {
      onGrblReport(d);
    } else if (isGrblSettings(d)) {
      onGrblSettings(d);
    } else if (isGrblProbe(d)) {
      onGrblProbe(d);
    } else if (isGrblBuildInfo(d)) {
      onGrblBuildInfo(d);
    } else if (isGrblError(d)) {
      that.dispatchEvent('grbl-error', d);
    } else if (isGrblAlarm(d)) {
      that.dispatchEvent('grbl-alarm', d);
    } else {
      that.dispatchEvent('unknown', d);
    }
  };

  // format is <[status],MPos:[x],[y],[z],WPos:[x],[y],[z],Pin:|0|>
  var onGrblReport = function (d) {
    var numberRe = '([-+]?[0-9]*\\.?[0-9]+)';
    var positionRe = numberRe + ',' + numberRe + ',' + numberRe;
    var statusRe = '(\\w+)';
    var probeRe = '(?:,Pin:(?:\\d{3})?\\|(\\d)\\|)?';

    var match = d.match(new RegExp(statusRe + ',MPos:' + positionRe + ',WPos:' + positionRe + probeRe));

    if (match) {
      that.dispatchEvent('status', match[1].toLowerCase());
      that.dispatchEvent('position', {
        machine: {
          x : parseFloat(match[2]),
          y : parseFloat(match[3]),
          z : parseFloat(match[4])
        },
        work: {
          x : parseFloat(match[5]),
          y : parseFloat(match[6]),
          z : parseFloat(match[7])
        }
      });
      if (match[8]) {
        that.dispatchEvent('probe-status', parseInt(match[8]));
      }
    }
  };

  var onGrblBuildInfo = function(d) {
    var match = d.match(/^\[(.+)\]$/);
    if (match) {
      var fields = match[1].split(':');
      if (fields.length >= 4) {
        that.dispatchEvent('machine-type', { product: fields[1], revision: fields[2] });
      }
      that.dispatchEvent('serial-number', fields[fields.length - 1]);
    }
  };

  var onGrblSettings = function(d) {
    that.dispatchEvent('settings', d);
  };

  var onGrblProbe = function(d) {  // sample string: [PRB:0.000,0.000,0.418:1]
    var match = d.match(/\[PRB:.+:(0|1)\]/);
    that.dispatchEvent('probe-result', match[1]);
  };

  that.parseData = parseData;

  return that;
}

module.exports = Parser;
