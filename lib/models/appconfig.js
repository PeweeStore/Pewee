var fs = require('fs');


var AppConfig = function(appName, json) {


  // Properties
  this.password = json.password;
  this.image = null;


  // Methods



  // Constructor
  if(json.imageFile) {
    var path = require('../settings').distributionFolder +  '/' + appName + '/' + json.imageFile;
    var original_data = fs.readFileSync(path);
    var base64Image = new Buffer(original_data, 'binary').toString('base64');
    this.image = base64Image;
  }


};


AppConfig.prototype.flushSecureInformation = function() {
  this.password = null;
};


module.exports = AppConfig;
