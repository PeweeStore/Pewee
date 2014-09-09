var express = require('express');
var router = express.Router();
var settings = require('../settings.js');


var applicationLogoImageHandler = function(req, res) {
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


router.get('/img/logo',
  applicationLogoImageHandler);

router.get('/css',
  applicationCustomCSSHandler);


module.exports = router;
