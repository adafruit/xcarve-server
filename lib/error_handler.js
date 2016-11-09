// this file is part of the v0.2.7 easel local OS X install.
// you can find out more about easel and the x-carve at
// inventables.com & easel.inventables.com

var ErrorHandler = (function () {

  return {
    trigger : function (err) {
      // TODO: better error handling and recovery
      console.error(err);
    }
  }
})();

module.exports = ErrorHandler;
