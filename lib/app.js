
var distribution = require('./distribution');
var settings = require('./settings');
var https = require('https');

var App = {
  webserver : null
};

App.start = function(hostname, port, secure, callback) {

  var webserver = require('./webserver');

  if(!secure) {
    secure = false;
  }

  webserver.set('port', port || 3000);
  webserver.set('hostname', hostname || "localhost");
  webserver.set('secure', secure);

  this.webserver = webserver;

  distribution.initializeDistributionFolder(true, function(success, error) {
    if(success) {

      distribution.appList(function(error, apps) {
        settings.debug("App List: " + apps);
      });

      distribution.versionList('AppTest', function(error, versions) {
        settings.debug(JSON.stringify(versions));
      });


      var webServerListenCallback = function() {
        callback(webserver.get('hostname'), webserver.get('port'));
      };

      if(hostname) {
        webserver.listen(webserver.get('port'), hostname, webServerListenCallback);
      } else {
        webserver.listen(webserver.get('port'), webServerListenCallback);
      }

    }
  });
};


module.exports = App;
