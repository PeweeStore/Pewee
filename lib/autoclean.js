var distribution = require('./distribution');
var fs = require('fs');
var _ = require('underscore');
var settings = require('./settings.js');

var autoclean = {}

function needToCleanAppWithCreationDateRule(limitedNumber, appName, callback) {
  distribution.versionList(appName, function(error, versions) {

    var iosList = [];
    var androidList = [];
    _.each(versions, function(versionDetail, version, list) {
      if (versionDetail.ios) {
        versionDetail['version'] = version;
        iosList.push(versionDetail);
      }
      if (versionDetail.android) {
        versionDetail['version'] = version;
        androidList.push(versionDetail);
      }
    })

    if (iosList.length < limitedNumber & androidList.length < limitedNumber) {
      return callback(null, false);
    } else {
      return callback(null, true)
    }
  });
}


autoclean.appHaveAutoCleanRule = function(appName, callback) {
  distribution.appConfig(appName, function(error, appConfig) {
    if (error) {
      return callback(error);
    }

    return callback(null, appConfig.autoCleanRule.rule !== null);
  });
}

autoclean.checkAppNeedToApplyRule = function(appName, callback) {
  distribution.appConfig(appName, function(error, appConfig) {
    if (error) {
      return callback(error);
    }


    if(appConfig.autoCleanRule.rule == "creation_date") {

      return needToCleanAppWithCreationDateRule(appConfig.autoCleanRule.number || Number.MAX_VALUE, appName, function(error, needed) {
        if (needed) {
          return callback(error, needed, autoclean.cleanAppWithCreationDateRule, [appName, appConfig.autoCleanRule.number || Number.MAX_VALUE]);
        } else {
          return callback(error, needed);
        }
      });

    } else {
      return callback(null, false);
    }
  });
}

autoclean.cleanAppWithCreationDateRule = function(appName, limitedNumber, callback) {
  console.log("CLEANINNNNG");
  needToCleanAppWithCreationDateRule(limitedNumber, appName, function(error, needed) {
    if (error) {
      return callback(error);
    }
    if (!needed) {
      return callback();
    }

    distribution.versionList(appName, function(error, versions) {
      var currentDate = new Date();
      var iosList = [];
      var androidList = [];
      _.each(versions, function(versionDetail, version, list) {
        if (versionDetail.ios) {
          versionDetail['version'] = version;
          iosList.push(versionDetail);
        }
        if (versionDetail.android) {
          versionDetail['version'] = version;
          androidList.push(versionDetail);
        }
      })

      if (iosList.length < limitedNumber & androidList.length < limitedNumber) {
        return callback();
      }

      iosList = _.sortBy(iosList, function (version) {
        return currentDate.getTime() - version.ios.lastChangeDate.getTime()
      });
      androidList = _.sortBy(androidList, function (version) {
        return currentDate.getTime() - version.android.lastChangeDate.getTime()
      });


      var path = settings.distributionFolder + "/" + appName;

      for (index in iosList) {
        if (index >= limitedNumber) {
          var versionDetail = iosList[index];
          var ipaPath = path + "/" + versionDetail.version + ".ipa";
          var plistPath = path + "/" + versionDetail.version + ".plist";
          fs.unlinkSync(ipaPath);
          fs.unlinkSync(plistPath);
        }
        index++;
      }

      index = 0
      for (index in androidList) {
        if (index >= limitedNumber) {
          var versionDetail = androidList[index];
          var apkPath = path + "/" + versionDetail.version + ".apk";
          fs.unlinkSync(apkPath);
        }
        index++;
      }


      callback();
    });
  })
}



module.exports = autoclean;
