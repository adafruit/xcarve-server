// this file is part of the v0.2.7 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var nextId = 0;
exports.logger = function() { 
  var logger = function(name) {
    var that = {};

    var id = nextId++;
    var prefix = " " + name + " [id=" + id + "] ";

    var timestamp = function() {
      return (new Date()).toISOString();
    };

    var withColor = function(msg, color) {
      if (color) {
        if (Colors[color]) {
          color = Colors[color];
        }

        msg = color + msg + Colors['RESET'];
      }

      return msg;
    };

    var log = function(msg, color) {
      console.log(timestamp() + prefix + withColor(msg, color));
    };

    that.log = log;

    return that;
  };

  logger.colors = {
    RED     : '\033[31m',
    GREEN   : '\033[32m',
    YELLOW  : '\033[33m',
    BLUE    : '\033[34m',
    MAGENTA : '\033[35m',
    CYAN    : '\033[36m',
    RESET   : '\033[0m'
  };

  return logger;
}();

