var settings = require('../../settings.js');

module.exports.homePageActivated = function(req, res, next) {
  var showHome = settings.showHomeStore;

  if(showHome) {
    next();
  } else {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }
}

module.exports.checkReloadSettings = function(req, res, next) {
  settings.checkAndReloadSettings(function() {
    next();
  });
}
