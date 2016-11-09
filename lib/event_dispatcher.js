// this file is part of the v0.2.7 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

module.exports = function(that) {
  var listeners = [];

  var dispatchEvent = function(name, data) {
    listeners.forEach( function(listener) {
      if (listener.name === name) {
        listener.f.call(listener.context, data);
      }
    });
  };

  var addEventListener = function(name, func, ctx) {
    listeners.push({name: name, f: func, context: ctx});
  };

  var removeEventListener = function(name, func) {
    var i = listeners.indexOf({name: name, f: func});
    listeners = listeners.slice(i, i);
  };

  that.dispatchEvent = dispatchEvent;
  that.addEventListener = addEventListener;
  that.removeEventListener = removeEventListener;

  return that;
}

