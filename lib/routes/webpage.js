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
var winston = require('winston');

// Middleware
var mw_checkHomePageActivated = require('./middleware/settings.js').homePageActivated;

var mw_checkAdministratorRight = require('./middleware/security.js').administratorRightCheck;
var mw_needAdministratorRight = require('./middleware/security.js').administratorRightNeedCheck;
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

var applicationVersionRemoveHandler = function(req, res) {
  var version = req.params.version;
  var appName = req.params.appname;
  var os = req.params.os;

  distribution.versionDetail(appName, version, function(err, versionDetail) {
    if (err) {
      return res.status(404).end();
    }

    var detailForOs = versionDetail[os];

    if (!detailForOs) {
      return res.status(404).end();
    }
    
    if (os === "android") {
      distribution.appFilePath(appName, version, os, null, function(err, filePath) {
        if (filePath) {
          fs.unlink(filePath, function(err) {
            if(err) {
              return res.status(500).end();
            }
            return res.status(200).end();
          });
        } else {
          return res.status(500);
        }
      });
    } else if (os === "ios") {
      distribution.appFilePath(appName, version, os, null, function(err, plistfilePath) {
        distribution.appFilePath(appName, version, os, "ipa", function(err, ipaFilePath) {
          if (plistfilePath && ipaFilePath) {
            fs.unlink(plistfilePath, function(err) {
              if(err) {
                return res.status(500).end();
              }
              fs.unlink(ipaFilePath, function(err) {
                if(err) {
                  return res.status(500).end();
                }
                res.status(200).end();   
              });
            });
          } else {
            res.status(500);
          }
        });
      });
    } else {
      return res.status(400).end();
    }
  });
}

// middleware & param fonction using
router.param('appname',
  mw_checkAppExist);

// Route definition
router.get('/',
  mw_checkAdministratorRight,
  mw_checkHomePageActivated,
  applicationListHandler);

router.get('/app/:appname',
  mw_checkAdministratorRight,
  mw_checkAppAuthentication,
  applicationPageHandler);

router.get('/app/:appname/index',
  mw_checkAdministratorRight,
  mw_checkAppAuthentication,
  applicationPageHandler);

router.get('/app/:appname/auth',
  mw_checkAppUnauthentication,
  mw_checkAdministratorRight,
  applicationAuthenticationPageHandler);

router.post('/app/:appname/auth',
  mw_checkAppUnauthentication,
  mw_checkAdministratorRight,
  applicationAuthenticationPostHandler);

// Commented because no real usage a this time
// router.get('/app/:appname/:version/detail',
//   mw_checkAppAuthentication,
//   mw_checkAppVersionExist,
//   applicationDetailPageHandler);

//JSON Ajax Handler
router.get('/app/:appname/detail',
  mw_checkAppAuthentication,
  mw_checkAdministratorRight,
  applicationDetailHandler);


router.post('/app/:appname/:version/remove/:os',
  mw_checkAdministratorRight,
  mw_needAdministratorRight,
  applicationVersionRemoveHandler
  );



// router.get('/app/:appname/version/detail/:os',
//   mw_checkAppAuthentication,
//   mw_checkAppVersionExist
//   )

module.exports = router;
