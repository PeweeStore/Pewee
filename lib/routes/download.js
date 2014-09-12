var express = require('express');
var router = express.Router();
var settings = require('../settings.js');

var mw_checkAppAuthentication = require('./middleware/security.js').appAuthenticationCheck;
var mw_checkAppTokenParameter = require('./middleware/security.js').appTokenParameter;
var mw_checkAppVersionExist = require('./middleware/app.js').appVersionExist;


var sendAppFile = function(req, res, appName, version, os, type) {
  if (type === 'undefined') type = null;
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
      res.download(filePath, fileName);
    }

  });
}

var applicationDownloadHandler = function(req, res) {
  var appName = req.params.appname;
  var version = req.params.version;
  var os = req.params.os;

  if(req.appExist) {
    distribution.versionDetail(appName, version, function(error, versionDetail) {
      if(error) {
        res.send(500, error);
      } else {
        if(versionDetail.contains(os)) {
          sendAppFile(req, res, appName, version, os);
        } else {
          res.send(404);
        }

      }
    });
  }
};

var applicationIPADownloadHandler = function(req, res) {
  var appName = req.params.appname;
  var version = req.params.version;
  var os = req.params.os;

  if(req.appExist) {
    distribution.versionDetail(appName, version, function(error, versionDetail) {
      if(error) {
        res.send(500, error);
      } else {
        if(versionDetail.contains(os)) {
          sendAppFile(req, res, appName, version, os, "ipa");
        } else {
          res.send(404);
        }

      }
    });
  }

};


router.get('/app/:appname/:version/download/:os',
  mw_checkAppAuthentication,
  mw_checkAppVersionExist,
  applicationDownloadHandler);

router.get('/app/:appname/:version/download/:os/ipa',
  mw_checkAppAuthentication,
  mw_checkAppVersionExist,
  applicationIPADownloadHandler);

router.get('/app/:appname/:version/download/:os/:appToken',
  mw_checkAppTokenParameter,
  mw_checkAppVersionExist,
  applicationDownloadHandler);

module.exports = router;
