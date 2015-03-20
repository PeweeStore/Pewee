var distribution = require('../../distribution');
var settings = require('../../settings.js');

module.exports.appAuthenticationCheck = function(req, res, next) {
  var appName = req.params.appname;
  var token = req.cookies[appName];

  distribution.appConfig(appName, function(error, appDetail) {
    if(appDetail.password !== null && appDetail.password !== undefined) {
      if(token == settings.appSecurityHash(appDetail.password)) {
        next();
      } else {
				console.log(token)
				console.log(appDetail.password)
				console.log(settings.appSecurityHash(appDetail.password))
        res.redirect('/app/'+appName+'/auth?fallback='+req.originalUrl);
      }
    } else {
      next();
    }
  });
};

module.exports.appUnauthenticationCheck = function(req, res, next) {
  var appName = req.params.appname;
  var token = req.cookies[appName];
  if(appName) {
    distribution.appConfig(appName, function(error, appDetail) {
      if(appDetail.password !== null && appDetail.password !== undefined) {
        if(token == settings.appSecurityHash(appDetail.password)) {
          res.redirect('/app/'+appName+'/index');
        } else {
          next();
        }
      } else {
        res.redirect('/app/'+appName+'/index');
      }
    });
  } else {
    res.send(404);
  }
};

module.exports.appTokenParameter = function(req, res, next) {

  var appName = req.params.appname;
  var token = req.cookies[appName];
  if(req.params.appToken) {
      token = req.params.appToken;
      res.cookie(appName, token, {signed: false});
  }

  distribution.appConfig(appName, function(error, appDetail) {
    if(token == settings.appSecurityHash(appDetail.password)) {
      next();
    } else {
      next(new Error("Not Authenticated"));
    }
  });
};

module.exports.globalAppSecurity = function(req, res, next) {
  if(!settings.secretToken) next();
  else {
    var globalToken = req.get("AppToken");
    if(!globalToken) {
      res.send(403);
    } else {
      if(globalToken == settings.secretToken) {
        next();
      } else {
        res.send(403);
      }
    }
  }
}
