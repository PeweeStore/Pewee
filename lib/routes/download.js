var express = require('express');
var router = express.Router();
var settings = require('../settings.js');
var distribution = require('../distribution');
var ipa = require('../ipa');

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

      if (os == "ios" && type != "ipa") {
        distribution.appConfig(appName, function(error, appDetail) {
          if (error) {
            return res.send(404, error);
          }

          if(appDetail.password !== null && appDetail.password !== undefined) {
            var token = settings.appSecurityHash(appDetail.password);
            ipa.objectFromPlist(filePath, function(err, plistObject) {
              if (err) {
                return res.send(500, err);
              }

              var newPlist = ipa.regenerateOTAManifestWithToken(plistObject, token);
              res.send(ipa.plistFromObject(newPlist));
            });
          } else {
            res.download(filePath, fileName);
          }
        });
      } else {
        res.download(filePath, fileName);
      }

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
        if(versionDetail[os]) {
          sendAppFile(req, res, appName, version, os);
        } else {
          res.send(404);
        }

      }
    });
  } else {
    res.send(404);
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
        if(versionDetail[os]) {
          sendAppFile(req, res, appName, version, os, "ipa");
        } else {
          res.send(404);
        }

      }
    });
  } else {
    res.send(404);
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
