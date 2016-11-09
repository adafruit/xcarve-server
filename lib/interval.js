// this file is part of the v0.2.7 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var interval = function(callback) {
  var id = null;

  var start = function(delay) {
    clearInterval(id);
    id = setInterval(callback, delay);
  }

  var stop = function() {
    clearInterval(id);
    id = null;
  }

  var that = {};
  that.start = start;
  that.stop = stop;
  return that;
}

module.exports = interval;

