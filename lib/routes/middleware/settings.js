var settings = require('../../settings.js');

module.exports.homePageActivated = function(req, res, next) {
  var showHome = settings.showHomeStore;

  if(showHome || res.locals.authenticateAsAdministrator) {
    next();
  } else {
    
    if (res.locals.adminSectionAvailable) {
    	res.redirect("/admin/login?fallback=/");
    } else {
    	res.send(404);
    }
  }
}

module.exports.checkReloadSettings = function(req, res, next) {
  settings.checkAndReloadSettings(function() {
    next();
  });
}
