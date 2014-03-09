'use strict';

/**
 * Module dependencies.
 */

var express = require('express');

var fixtures = require('./test/fixtures');
var swagger = require('./lib');

var host = process.env.HOST || '127.0.0.1';
var port = process.env.PORT || 8000;
var url = 'http://' + host + ':' + port;

/**
 * Create framework
 */

var framework = fixtures.framework({ basePath: url });

/**
 * Expose framework
 */

if (module.parent) {
  module.exports = framework;
} else {
  var app = express();

  app.use('/api-docs', framework.docs.callback());
  app.use(framework.callback());

  app.listen(port, host, function(err) {
    if (err) throw err;
    console.log('Server started ' + url + '/');
  });
}
