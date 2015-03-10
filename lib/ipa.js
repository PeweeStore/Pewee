var plist = require('plist');
var AdmZip = require('adm-zip');
var bplist = require('bplist-parser');

var ipa = {};

ipa.objectFromProperties = function(bundleId, bundleVersion, title, downloadUrl) {

  return {
    items: [
      {
        assets: [
          {
            kind:"software-package",
            url: downloadUrl
          }
        ],
        metadata: {
          'bundle-identifier': bundleId,
          'bundle-version': bundleVersion,
          kind: "software",
          title: title
        }
      }
    ]
  };
};

ipa.plistFromObject = function(object) {
  return plist.build(object);
};

ipa.generateOTAManifestFromIPA = function(ipaPath, downloadUrl, callback) {
  var zipped = new AdmZip(ipaPath);


  zipped.getEntries().forEach(function(zipEntry) {

    if(zipEntry.entryName.indexOf("storyboard") < 0 && zipEntry.name == "Info.plist" ) {

      zipEntry.getDataAsync(function(data, error)  {

        bplist.parseFile(data, function(error, object) {

          var plistObject= object[0];

          var bundleVersion = plistObject.CFBundleVersion;
          var bundleId = plistObject.CFBundleIdentifier;
          var appName = plistObject.CFBundleDisplayName;

          var manifestObject = ipa.objectFromProperties(bundleId, bundleVersion, appName, downloadUrl);


          callback(null, manifestObject);
        });

      })

    }
  });

};



ipa.infoPlistObject = function(plistText) {
  var plistObj = plist.parse(plistText);

  return plistObj;
}

module.exports = ipa;
