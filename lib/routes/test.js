var express = require('express');
var distribution = require ('../distribution');

var router = express.Router();

router.get('/app/path/:appname/:os/:version/:type?', function(req, res) {

  var appName = req.params.appname;
  var os = req.params.os;
  var version = req.params.version;
  var type = req.params.type;

  distribution.appFilePath(appName, version, os, type, function(error, filePath) {

    if(error) {
      res.send(404, error);
    } else {
      res.send(200, filePath);
    }

  });
});


router.get('/app/:appname/:os/:version/:type?', function(req, res) {
  var appName = req.params.appname;
  var os = req.params.os;
  var version = req.params.version;
  var type = req.params.type;

  var fileName = appName + "-" + version;
  if(os === "ios") {
    if(type === "ipa") {
      fileName = fileName + ".ipa";
    } else {
      fileName = fileName + ".plist";
      res.set('Content-type', 'application/xml')
    }
  } else {
    fileName = fileName + ".apk";
    res.set('Content-type', 'application/vnd.android.package-archive');
  }

  distribution.appFilePath(appName, version, os, type, function(error, filePath) {

    if(error) {
      res.send(404, error);
    } else {
      res.sendfile(filePath);
    }

  });
});


router.get('/app/:appname/config', function(req, res) {

  var appName = req.params.appname;

  distribution.appConfig(appName, function(err, appConfig) {
    if(err) {
      res.send(500, err);
    } else {
      res.send(200, JSON.stringify(appConfig));
    }
  });

});

module.exports = router;
