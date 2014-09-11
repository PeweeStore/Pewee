var express = require('express');
var router = express.Router();
var settings = require('../settings.js');
var distribution = require('../distribution');

var mw_checkAppExist = require('./middleware/app.js').appExist;

var storeLogoImageHandler = function(req, res) {
  var logoImagePath = settings.hello.logo;
  res.sendFile(logoImagePath);
}

var applicationCustomCSSHandler = function(req, res) {
  var cssPath = settings.customCSS;
  if(cssPath !== null && cssPath !== undefined) {
    res.sendFile(cssPath);
  } else {
    res.send("");
  }
}

var applicationLogoImageHandler = function(req, res) {
  var appName = req.params.appname;
  distribution.appConfig(appName, function(error, appDetail) {
    if(error) {
      res.send(500, error);
    } else {
      if(appDetail.appImagePath()) {
        res.sendFile(appDetail.appImagePath());
      } else {
        res.send(404);
      }      
    }
  });
}

router.param('appname',
  mw_checkAppExist);

router.get('/img/logo',
  storeLogoImageHandler);

router.get('/css',
  applicationCustomCSSHandler);

router.get('/img/logo/:appname',
  applicationLogoImageHandler);


module.exports = router;
