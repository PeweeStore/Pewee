var express = require('express');
var router = express.Router();
var mime = require('mime');
var checksum = require('checksum');
var AdmZip = require('adm-zip');
var fs = require('fs');
var ipa = require('../ipa');
var winston = require('winston');
var settings = require('../settings.js');
var distribution = require('../distribution');
var autoclean = require('../autoclean');

var mw_checkGlobalAppSecurity = require('./middleware/security.js').globalAppSecurity;

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", done);

  var wr = fs.createWriteStream(target);
  wr.on("error", done);
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

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
              copyFile(fileDetail.path, appPath, function(err) {
                if (err) {
                  res.send(500, "Can't write app");
                  next();
                  return
                }
                var app = require('../app');


                var downloadUrl = app.webserver.getBaseUrl() + 'app/' + encodeURI(appName) +'/' + version + '/download/ios/ipa';
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
              });



            } else {
              res.send(401, 'IPA integrity failure');
              next();
            }

          } else {
            // Temporary remove APK Parsing (lib used can't load new and huge AndroidManifest.xml file)
            //todo : analyse apk file and copy it
            // apk(fileDetail.path, function(error, data) {
              // if(!error) {
                var appPath = settings.distributionFolder + "/" + appName + "/" + version + ".apk";
                copyFile(fileDetail.path, appPath, function(err) {
                  if (err) {
                    res.send(500, "Can't write app");
                    next();
                    return
                  }

                  res.send(200);
                  next();
                });
          //     } else {
          //       res.send(400);
          //     }
          //   });
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
    // files.file.forEach(function(file) {
    //
    //   fs.unlink(file.path, function(error) {
    //     if(error) {
    //       winston.warning("Can't delete file upload at " + file.path);
    //     }
    //   });
    //
    // });
  } else {

    var fileDetail = files.file;
    fs.unlink(fileDetail.path, function(error) {
      if(error) {
        winston.warning("Can't delete file upload at " + file.path);
      }
    });

  }
}

var applicationVersionPostTasksHandler = function(req, res, next) {
  var appName = req.params.appname;


  autoclean.appHaveAutoCleanRule(appName, function(error, have) {
    if (have) {
      autoclean.checkAppNeedToApplyRule(appName, function(error, needed, methodToCallForClean, argumentsToComplete) {
        if (needed) {
          argumentsToComplete.push(function() {
            next();
          });

          methodToCallForClean.apply(this, argumentsToComplete);
        } else {
          next();
        }
      });
    } else {
      next();
    }
  });
}



router.post('/upload/:appname/type/:os/version/:version/:shasum',
  mw_checkGlobalAppSecurity,
  applicationVersionUploadHandler,
  applicationVersionPostTasksHandler,
  applicationVersionFinishUploadHandler);

module.exports = router;
