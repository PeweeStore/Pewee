var fs = require('fs');
var settings = require('../settings');

var AppConfigAutoCleanRule = require('./autocleanrule');


var AppConfig = function(appName, json) {


  // Properties
  this.password = json.password;
  this.image = null;
  this.imageFilePath = null;
  this.autoCleanRule = settings.globalAutoCleanRule || new AppConfigAutoCleanRule(null);
  if (json.autoCleanRule) {
    this.autoCleanRule = new AppConfigAutoCleanRule(json.autoCleanRule);
    if (this.autoCleanRule.rule == null && settings.globalAutoCleanRule) {
      this.autoCleanRule = settings.globalAutoCleanRule;
    }
  }

  // Methods



  // Constructor
  if(json.imageFile) {
    var path = require('../settings').distributionFolder +  '/' + appName + '/' + json.imageFile;
    this.imageFilePath = path;
    var original_data = fs.readFileSync(path);
    var base64Image = new Buffer(original_data, 'binary').toString('base64');
    this.image = base64Image;
  }


};


AppConfig.prototype.flushSecureInformation = function() {
  this.password = null;
  this.imageFilePath = null;
  this.autoCleanRule = null;
};

AppConfig.prototype.appImage = function(callback) {
  fs.readFile(this.imageFilePath, callback);
}

AppConfig.prototype.appImagePath = function() {
  return this.imageFilePath;
}

module.exports = AppConfig;
