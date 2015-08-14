var ErrorHandler = (function () {

  return {
    trigger : function (err) {
      // TODO: better error handling and recovery
      console.error(err);
    }
  }
})();

module.exports = ErrorHandler;