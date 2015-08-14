
exports.logger = function() { 
  var logger = function(name) {
    var that = {};

    var id = Date.now();
    var prefix = name + " [id=" + id + "] ";

    var timestamp = function() {
      return "[time=" + Date.now() + "] ";
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
      console.log(prefix + timestamp() + withColor(msg, color));
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

