var settings = require('./settings.js');
var fs = require('fs');
var _ = require('underscore');
var Map = require('collection').Map,
    Vector = require('collection').Vector;
var filepath = require('path');
var AppConfig = require ('./models/appconfig');

var distribution = {};


distribution.initializeDistributionFolder = function(forceCreate, callback) {
  var path = settings.distributionFolder;

  fs.readdir(path, function(err, files) {
    if(err) {
      settings.debug("Distribution Folder doesn't exist, force create ? (%s)", forceCreate);

      if(forceCreate) {

        fs.mkdir(path, function(exception) {
          if(exception) {
            callback(false, exception);
          } else {
            callback(true, null);
          }
        });

      } else {
        callback(false, err);
      }

    } else {
      callback(true, null);
    }
  });
};

distribution.appList = function(callback) {
  var path = settings.distributionFolder;

  fs.readdir(path, function(err, files) {
    if(err) {

      callback(err, null);
      return;

    } else {

      var filesFiltered = _.reject(files, function(file) { return file == "config.json" || file.indexOf(".") === 0 || !distribution.appExistSync(file)});


      callback(null, filesFiltered);

    }

  });
};

distribution.appExist = function(appName, callback) {
  var path = settings.distributionFolder + "/" + appName;
  fs.stat(path, function(err, stat) {
    if(stat && stat.isDirectory()) {
      callback(true);
    } else {
      callback(false);
    }
  });
};

distribution.appExistSync = function(appName) {
  var path = settings.distributionFolder + "/" + appName;
  var stat = fs.statSync(path);
  if(stat && stat.isDirectory()) {
    return true;
  } else {
    return false;
  }
};


distribution.appVersionExist = function(appName, appVersion, callback) {
  distribution.versionList(appName, function(error, versions) {

    if(error) {
      callback(false);
    } else {
      var haveVersion = false;

      for(var version in versions) {
        if(version === appVersion) {
          haveVersion = true;
        }
      }

      callback(haveVersion);
    }
  });
};

distribution.versionDetail = function(appName, appVersion, callback) {
  distribution.versionList(appName, function(error, versions) {
    if(error) {
      callback(error, null);
    } else {

      var detail = versions[appVersion];

      callback(null, detail);
    }
  });
}

distribution.versionList = function(app, callback) {
  var path = settings.distributionFolder + "/" + app;

  fs.readdir(path, function(err, files) {

    if(err) {

      callback('No app named ' + app, null);
      return;

    } else {

      var filesFiltered = _.reject(files, function(file) { return file == "config.json" || file.indexOf(".") === 0});
      filesFiltered = _.filter(files, function(file) {return file.endsWith(".apk") || file.endsWith(".plist")});

      var versions = new Map();

      _.each(filesFiltered, function(file) {

        var extension = filepath.extname(file);
        var version = filepath.basename(file, extension);

        var os;
        if(extension === '.apk') {
          os = "android";
        } else if(extension === '.plist') {
          os = "ios";
        }

        var versionObject = new Vector(versions.get(version));

        versionObject.add(os);

        versions.set(version, versionObject.toArray());
      });

      callback(null, versions.toObject());
    }

  });
};

distribution.appFilePath = function(app, version, os, type, callback) {
  distribution.appList(function(error, appList) {

    if(_.indexOf(appList, app) == -1) {

      callback('No app named ' + app, null);
      return;

    } else {

      distribution.versionList(app, function(error, versionList) {
        var versionDetail = versionList[version];
        if(versionDetail && versionDetail.contains(os)) {

          var path = settings.distributionFolder + '/' + app + '/' + version;
          if(os === "ios") {
            if(type === "ipa") {
              path = path + ".ipa";
            } else {
              path = path + ".plist";
            }
          } else if(os === "android") {
            path = path + ".apk";
          }

          callback(null, path);

        } else {
          callback('No version ' + version + ' on ' + os, null);
        }

      });

    }
  });
};

distribution.appConfig = function(app, callback) {
  distribution.appList(function(error, appList) {

    if(_.indexOf(appList, app) == -1) {

      callback('No app named ' + app, null);
      return;

    } else {

      var path = settings.distributionFolder +  '/' + app + '/config.json';
      fs.readFile(path, 'utf8', function(err, data) {
        if(err) {

          callback(null, new AppConfig(app, {}));
          return;

        } else {

          callback(null, new AppConfig(app, JSON.parse(data)));
          return;

        }
      });
    }

  });
};

distribution.appDetail = function(app, callback) {
  distribution.appList(function(error, appList) {

    if(_.indexOf(appList, app) == -1) {

      callback('No app named ' + app, null);
      return;

    } else {

      var path = settings.distributionFolder +  '/' + app + '/config.json';
      fs.readFile(path, 'utf8', function(err, data) {
        var appConfig = null;
        if(err) {
          appConfig = new AppConfig(app, {});
        } else {
          appConfig = new AppConfig(app, JSON.parse(data));
        }
        appConfig.flushSecureInformation();

        callback(null, appConfig);


      });
    }

  });
};


module.exports = distribution;
