// this file is part of the v0.2.1 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var _ = require('underscore')._
  , Debugger = require('./debugger')
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
    return d.match(/<(.*)>/);
  };

  var isGrblSettings = function (d) {
    return d.match(/\$\d+\s*=/);
  };

  var isGrblError = function (d) {
    return d.match(/error:(.*)/);
  };

  var isGrblAlarm = function (d) {
    return d.match(/ALARM:(.*)/);
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
    } else if (isGrblError(d)) {
      that.dispatchEvent('grbl-error', d);
    } else if (isGrblAlarm(d)) {
      that.dispatchEvent('grbl-alarm', d);
    } else {
      that.dispatchEvent('unknown', d);
    }
  };

  // format is <[status], MPos:[x],[y], [z] ... >
  var onGrblReport = function (d) {
    var numberRe = '([-+]?[0-9]*\\.?[0-9]+)';
    var positionRe = numberRe + ',' + numberRe + ',' + numberRe;
    var stateRe = '(\\w+)';
    var statusRe = new RegExp(stateRe + ',MPos:' + positionRe + ',WPos:' + positionRe);
    var statusMatch = d.match(statusRe);

    if (statusMatch) {
      that.dispatchEvent('state', statusMatch[1].toLowerCase());
      that.dispatchEvent('position', {
        machine: {
          x : parseFloat(statusMatch[2]),
          y : parseFloat(statusMatch[3]),
          z : parseFloat(statusMatch[4])
        },
        work: {
          x : parseFloat(statusMatch[5]),
          y : parseFloat(statusMatch[6]),
          z : parseFloat(statusMatch[7])
        }
      });
    }
  };

  var onGrblSettings = function(d) {
    logger.log("parsing settings data: " + d);
    that.dispatchEvent('settings', d);
  };

  that.parseData = parseData;

  return that;
}

module.exports = Parser;
