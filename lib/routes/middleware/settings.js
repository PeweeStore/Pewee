var settings = require('../../settings.js');

module.exports.homePageActivated = function(req, res, next) {
  var showHome = settings.showHomeStore;

  if(showHome) {
    next();
  } else {
    res.send(404);
  }
}

module.exports.checkReloadSettings = function(req, res, next) {
  settings.checkAndReloadSettings(function() {
    next();
  });
}
