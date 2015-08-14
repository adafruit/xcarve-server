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

