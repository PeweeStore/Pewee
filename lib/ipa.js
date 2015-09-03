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
          },
          {
            kind:"display-image",
            "needs-shine": true,
            url:"http://www.example.com/image.57×57.png"
          },
          {
            kind:"full-size-image",
            "needs-shine": true,
            url:"http://www.example.com/image.512×512.png"
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

ipa.objectFromPlist = function(filePath, callback) {
  callback(null, plist.parse(require('fs').readFileSync(filePath, 'utf8')));
  // require('fs').readFile(filePath, function(err, fileContent) {
  //   if (err) {
  //     callback(err, null);
  //   } else {
  //     callback(null, plist.parse(fileContent));
  //   }
  // });
};

ipa.regenerateOTAManifestWithToken = function(oldManifest, token) {
  var newManifest = oldManifest;
  for (var i = 0; i < newManifest.items[0].assets.length; i++) {
    var item = newManifest.items[0].assets[i];
    if (item.kind == "software-package") {
      item.url = item.url + "?token=" + encodeURIComponent(token);
    }
  }
  return newManifest;
};

ipa.generateOTAManifestFromIPA = function(ipaPath, downloadUrl, callback) {
  var zipped = new AdmZip(ipaPath);


  zipped.getEntries().forEach(function(zipEntry) {

    if(zipEntry.entryName.indexOf("storyboard") < 0 && zipEntry.entryName.indexOf("appex") < 0 && zipEntry.name == "Info.plist" ) {

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
