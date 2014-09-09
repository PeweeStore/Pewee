var express = require('express');
var router = express.Router();
var settings = require('../settings.js');
var distribution = require('../distribution');
var auth = require('basic-auth');
var crypto = require('crypto');
var mime = require('mime');
var AdmZip = require('adm-zip');
var fs = require('fs');
var ipa = require('../ipa');
var checksum = require('checksum');
var apk = require('apk-parser2');
var winston = require('winston');

// Middleware
var mw_checkHomePageActivated = require('./middleware/settings.js').homePageActivated;


var mw_checkAppAuthentication = require('./middleware/security.js').appAuthenticationCheck
var mw_checkAppUnauthentication = require('./middleware/security.js').appUnauthenticationCheck;
var mw_checkAppTokenParameter = require('./middleware/security.js').appTokenParameter;

var mw_checkAppExist = require('./middleware/app.js').appExist;
var mw_checkAppVersionExist = require('./middleware/app.js').appVersionExist;

var mw_checkGlobalAppSecurity = require('./middleware/security.js').globalAppSecurity;
// var mw_checkAndReloadSettings = require('./moddleware/settings.js').checkReloadSettings;

// Request Handler
var applicationListHandler = function(req, res) {
  distribution.appList(function(error, appList) {
    if(error) {
      res.send(500, error);
    } else {
      res.render('applist', {apps: appList, settings: settings.renderSettings()});
    }
  });
};

var applicationPageHandler = function(req, res) {

  var appName = req.params.appname;

  distribution.versionList(appName, function(error, versions) {
    if(error) {
      res.send(404);
    } else {
      res.render("versionlist", {app: appName, versions: versions});
    }
  });
}

var applicationAuthenticationPageHandler = function(req, res) {
  res.render("auth", {appName: req.params.appname});
}

var applicationAuthenticationPostHandler = function(req, res) {
  var token = req.body.token;
  token = settings.appSecurityHash(token);
  var appName = req.params.appname;
  res.cookie(appName, token, {signed: false});
  res.redirect(req.query.fallback);
}

var applicationDetailPageHandler = function(req, res) {
  var appName = req.params.appname;
  var version = req.params.version;

  if(req.appExist) {

    distribution.versionDetail(appName, version, function(error, versionDetail) {

      if(error) {
        res.send(500, error);
      } else {

        res.render('versiondetail', {appName:appName, version:version, detail:versionDetail});
      }

    });


  } else {
    res.render('versionnotfound', {appName:appName, version:version, detail:versionDetail});
  }
}

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


var applicationVersionUploadHandler = function(req, res, next) {

  var appName = req.params.appname;
  var os = req.params.os;
  var version = req.params.version;
  var shasum = req.params.shasum;

  var files = req.files;

  if(files.file instanceof Array) {
    res.send(401, "too many files");
    next();
  } else {

    var fileDetail = files.file;

    var mimeType = mime.lookup(fileDetail.path)
    if(mimeType !== 'application/octet-stream'
        && mimeType !== 'application/vnd.android.package-archive') {
        res.send(401, 'File format ' + fileDetail.mimeType + ' not allowed');
        next();
    } else {
      //verify shasum

      checksum.file(fileDetail.path, {algorithm: "sha256"}, function(error, sum) {
        if(sum === shasum) {

          if(os == 'ios') {
            var havePayloadFolder = false;
            var haveAppFolder = false;
            var zipped = new AdmZip(fileDetail.path);

            zipped.getEntries().forEach(function(zipEntry) {
              if(zipEntry.entryName === "Payload/") {
                havePayloadFolder = true;
              }

              if(zipEntry.entryName.indexOf(".app") != -1) {
                haveAppFolder = true;
              }
            });

            if(havePayloadFolder && haveAppFolder) {
              // IPA integrity checked !

              var appPath = settings.distributionFolder + "/" + appName + "/" + version + ".ipa";
              var plistPath = settings.distributionFolder + "/" + appName + "/" + version + ".plist";
              fs.createReadStream(fileDetail.path).pipe(fs.createWriteStream(appPath));

              var app = require('../app');


              var downloadUrl = app.webserver.getBaseUrl() + 'app/' + appName +'/' + version + '/download/ios/ipa';
              ipa.generateOTAManifestFromIPA(fileDetail.path, downloadUrl, function(error, plistObject) {

                fs.writeFile(plistPath, ipa.plistFromObject(plistObject).toString(), function(error) {
                  if(error) {
                    fs.unlink(appPath, function(error){});
                    res.send(500, "Can't write OTA Manifest Plist file to " + plistPath);

                  } else {
                    res.send(200);
                  }
                  next();

                });
              });

            } else {
              res.send(401, 'IPA integrity failure');
              next();
            }

          } else {
            //todo : analyse apk file and copy it
            apk(fileDetail.path, function(error, data) {
              if(!error) {
                var appPath = settings.distributionFolder + "/" + appName + "/" + version + ".apk";
                fs.createReadStream(fileDetail.path).pipe(fs.createWriteStream(appPath));
                res.send(200);
              } else {
                res.send(400);
              }
            });
          }



        } else {
          res.send(401, 'Bad checksum (file integrity ?)');
          next();
        }
      });

    }
  }
}


var applicationVersionFinishUploadHandler = function(req, res) {
  var files = req.files;

  if(files.file instanceof Array) {
    files.file.forEach(function(file) {

      fs.unlink(file.path, function(error) {
        if(error) {
          winston.warning("Can't delete file upload at " + file.path);
        }
      });

    });
  } else {

    var fileDetail = files.file;
    fs.unlink(fileDetail.path, function(error) {
      if(error) {
        winston.warning("Can't delete file upload at " + file.path);
      }
    });

  }
}

// JSON Handler

var applicationDetailHandler = function(req, res) {
  var appName = req.params.appname;

  distribution.appDetail(appName, function(error, appDetail) {
    if(error) {
      res.send(500, error);
    } else {
      // res.set('Content-type', 'application/json');
      res.json(appDetail);
    }
  });
}

var applicationVersionDetailIOSHandler = function(req, res) {
  var version = req.params.version;
  distribution.versionDetail(appName, version, function(error, versionDetail) {
    if(error) {
      res.send(404);
    } else {
      if(!versionDetail.contains('ios')) {
        res.send(404);
      } else {

        //todo:

      }
    }
  });
}

var applicationVersionDetailAndroidHandler = function(req, res) {
  //todo:
}

var applicationVersionDetailHandler = function(req, res) {
  if(req.params.os == "android") {
    applicationVersionDetailAndroidHandler(req, res);
  } else {
    applicationVersionDetailIOSHandler(req, res);
  }
}

// middleware & param fonction using
router.param('appname',
  mw_checkAppExist);

// Route definition
router.get('/',
  mw_checkHomePageActivated,
  applicationListHandler);

router.get('/app/:appname',
  mw_checkAppAuthentication,
  applicationPageHandler);

router.get('/app/:appname/index',
  mw_checkAppAuthentication,
  applicationPageHandler);

router.get('/app/:appname/auth',
  mw_checkAppUnauthentication,
  applicationAuthenticationPageHandler);

router.post('/app/:appname/auth',
  mw_checkAppUnauthentication,
  applicationAuthenticationPostHandler);

// Commented because no real usage a this time
// router.get('/app/:appname/:version/detail',
//   mw_checkAppAuthentication,
//   mw_checkAppVersionExist,
//   applicationDetailPageHandler);

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

router.post('/upload/:appname/type/:os/version/:version/:shasum',
  mw_checkGlobalAppSecurity,
  applicationVersionUploadHandler,
  applicationVersionFinishUploadHandler);


//JSON Ajax Handler
router.get('/app/:appname/detail',
  mw_checkAppAuthentication,
  applicationDetailHandler);

// router.get('/app/:appname/version/detail/:os',
//   mw_checkAppAuthentication,
//   mw_checkAppVersionExist
//   )

module.exports = router;
