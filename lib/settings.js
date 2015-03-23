var randomstring = require("randomstring");
var os = require('os');
var debug = require('debug')('InHouseAppStore');
var fs = require('fs');
var crypto = require('crypto');
var pkginfo = require('pkginfo')(module);
var winston = require('winston');
var bcrypt = require('bcrypt-nodejs')
var aes = require('aes-helper');
var AutoCleanRule = require('./models/autocleanrule');

var Settings = function() {

  this.settingsReloadDate = null;

  this.distributionFolder = os.tmpdir() + randomstring.generate(4);
  this.debug = debug;
  this.cookieSecret = randomstring.generate(4);
  this.secretToken = null;
  this.storeName = module.exports.name;
  this.hello = {
    title: "Welcome to Store!",
    message: null,
    logo: __dirname + "/public/img/logo@2x.png"
  };
  this.contactEmail = null;
  this.httpsKeyFilePath = null;
  this.httpsCertificateFilePath = null;
  this.httpsCAFilePath = null;
  this.showHomeStore = true;
  this.customCSS = null;
  this.globalAutoCleanRule = null;

  // Custom salt use by web app to generate a app security hash for cookie
  this.customSalt = bcrypt.genSaltSync(10)

};

Settings.prototype.appSecurityHash = function(originalPassword) {
  return bcrypt.hashSync(originalPassword, this.customSalt);
}

Settings.prototype.globalSecurityHash = function(originalPassword) {
  var a =  aes.encrypt(originalPassword, this.privateKey);
  return a;
}

Settings.prototype.checkFillAndCreatePrivateKeyIfNeeded = function(folderPath, callback) {
  var pathToPrivateKey = folderPath+'/privatekey';
  fs.readFile(pathToPrivateKey, function(error, fileData) {

    if(fileData) {
      //it's not the first launch so we have already a private key, use it !
      var privateKey = fileData;
      callback(null, privateKey);
    } else {
      //it's a first launch, create the private key and use it !
      var privateKey = crypto.randomBytes(100).toString('base64');
      fs.writeFile(pathToPrivateKey, privateKey, function(err) {
        if(err) {
          throw new Exception("Can't create a private key for this app");
          callback(err, null);
        } else {
          callback(null, privateKey);
        }
      });

    }
  })
}

Settings.prototype.fillWithConfigFolder = function(folderPath, callback) {
  var thisSettings = this;
  this.distributionFolder = folderPath;

  this.checkFillAndCreatePrivateKeyIfNeeded(this.distributionFolder, function(error, privateKey) {

    if(privateKey) {
      thisSettings.privateKey = privateKey;
    }

    fs.readFile(folderPath+'/config.json', function(error, fileData) {

      if(error) {

        // nothing to do, if error, we can't assume that's because no config file was setted
        // to prevent apparition of this error we create it with empty json
        fs.writeFileSync(folderPath+'/config.json', '{}')
        thisSettings.settingsReloadDate = new Date();
        winston.error(error);
        callback(error);

      } else {

        try {
          var settingsParsed = JSON.parse(fileData);

          if(settingsParsed.cookieSecret) {
            thisSettings.cookieSecret = settingsParsed.cookieSecret;
          }

          if(settingsParsed.secretToken) {
            thisSettings.secretToken = thisSettings.globalSecurityHash(settingsParsed.secretToken);
          }

          if(settingsParsed.storeName) {
            thisSettings.storeName = settingsParsed.storeName;
          }

          if(settingsParsed.hello) {
            if(settingsParsed.hello.title) {
              thisSettings.hello.title = settingsParsed.hello.title;
            }
            if(settingsParsed.hello.message) {
              thisSettings.hello.message = settingsParsed.hello.message;
            }
            if(settingsParsed.hello.logo) {
              thisSettings.hello.logo = thisSettings.distributionFolder + '/' + settingsParsed.hello.logo;
            }
          }

          if(settingsParsed.contactEmail) {
            thisSettings.contactEmail = settingsParsed.contactEmail;
          }

          if(settingsParsed.httpsKeyFilePath) {
            thisSettings.httpsKeyFilePath = thisSettings.distributionFolder + '/' + settingsParsed.httpsKeyFilePath;
          }

          if(settingsParsed.httpsCertificateFilePath) {
            thisSettings.httpsCertificateFilePath = thisSettings.distributionFolder + '/' + settingsParsed.httpsCertificateFilePath;
          }

          if(settingsParsed.httpsCAFilePath) {
            thisSettings.httpsCAFilePath = thisSettings.distributionFolder + '/' + settingsParsed.httpsCAFilePath;
          }

          if(settingsParsed.showHomeStore !== undefined) {
            thisSettings.showHomeStore = settingsParsed.showHomeStore;
          }

          if(settingsParsed.customCSS) {
            thisSettings.customCSS = thisSettings.distributionFolder + '/' + settingsParsed.customCSS;
          }

          if(settingsParsed.globalAutoCleanRule) {
            thisSettings.globalAutoCleanRule = new AutoCleanRule(settingsParsed.globalAutoCleanRule);
          }

        } catch(e) {
          throw "The distribution config.json file seems to be malformed:" + e;
        } finally {
          thisSettings.settingsReloadDate = new Date();
          callback(null);
        }
      }
    });
  });
};

Settings.prototype.renderSettings = function() {
  return {
    "storeName": this.storeName,
    "hello": this.hello,
    "contactEmail": this.contactEmail
  };
}

Settings.prototype.checkAndReloadSettings = function(callback) {
  var actualDate = new Date();
  var timePassedInSeconds = (actualDate.getTime() - this.settingsReloadDate.getTime()) / 1000;
  var timePassedInMinutes = timePassedInSeconds / 60;


  if(timePassedInMinutes > 5) {
    winston.info("Time passed before last settings load: %d minutes. Reloading now.", timePassedInMinutes);
    this.fillWithConfigFolder(this.distributionFolder, function() {
      winston.info("Settings reloaded.");
      callback();
    })
  } else {
    callback();
  }
}

module.exports = new Settings();
