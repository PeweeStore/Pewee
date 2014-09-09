var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var settings = require('./settings.js');
var https = require('https');
var http = require('http');
var multer = require('multer');
var fs = require('fs');
var winston = require('winston');
var expressWinston = require('express-winston');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('view cache', false);

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json({reviver: function(k, v) { if (k !== null) return v; }}));
app.use(bodyParser.urlencoded());
app.use(multer({
  limits: {
    fieldSize: 10000
  }
}));
app.use(cookieParser(settings.cookieSecret));
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console({
      json: false,
      colorize: true
    })
  ],
  meta: false, // optional: control whether you want to log the meta data about the request (default to true)
  msg: "HTTP {{res.statusCode}} - {{req.method}}  {{req.url}} - {{res.responseTime}}ms" // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
}));

app.use(require("./routes/middleware/settings").checkReloadSettings);

app.use('/', require('./routes/index'));
// app.use('/test', require('./routes/test'));
app.use('/res', require('./routes/resources'));

// app.use('/app', require('./routes/app'));

app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true
    })
  ]
}));


/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.getBaseUrl = function() {
  var protocol = (app.get('secure')? 'https': 'http');
  var hostname = app.get('hostname');
  var port = app.get('port');

  return protocol + '://' + hostname + ':' + port + '/';
}

app.listen = function() {
  app.locals.settings = settings.renderSettings();

  if(app.get('secure')) {
    settings = require('./settings');
    if(settings.httpsKeyFilePath == null || settings.httpsCertificateFilePath == null) {
      throw "HTTPS defined but not Key or/and Certificate file defined in distribution configuration file => (" + settings.httpsKeyFilePath + " ," + settings.httpsCertificateFilePath + ")";
    } else {
      var options = {
        key: fs.readFileSync(settings.httpsKeyFilePath),
        cert: fs.readFileSync(settings.httpsCertificateFilePath),
        ca: fs.readFileSync(settings.httpsCAFilePath),
        requestCert: true,
        rejectUnauthorized: false
      };
      var server = https.createServer(options, this);
      return server.listen.apply(server, arguments);
    }

  } else {
    var server = http.createServer(this);
    return server.listen.apply(server, arguments);
  }


}

module.exports = app;
