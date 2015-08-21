var distribution = require('../../distribution');

module.exports.appExist = function(req, res, next, id) {
  distribution.appExist(id, function(exist) {
    if(exist) {
      next();
    } else {
      next(new Error("App doesn't exist"));
    }
  });
}

module.exports.appVersionExist = function(req, res, next) {

  var appName = req.params.appname;
  var version = req.params.version;

  distribution.appVersionExist(appName, version, function(exist) {
    req.appExist = exist;
    next();
  });

}

module.exports.injectAppConfiguration = function(req, res, next) {
    
    var appName = req.params.appname;
    
    if (appName) {
        distribution.appDetail(appName, function(error, appConfig) {
            if (appConfig) {
                res.locals.appConfig = appConfig;
            }
            next(); 
        });  
    } else {
        next();
    }
}