'use strict';

/**
 * Module dependencies.
 */

var lodash = require('lodash');
var utils = require('./utils');

/**
 * Initialize a new `Docs`.
 *
 * @param {Object} options
 * @api private
 */

function Docs(framework) {
  this.framework = framework;
  this.apis = [];
  this.models = {};
}

/**
 * Return dispatcher.
 *
 * @param {Object} options
 * @api public
 */

Docs.prototype.dispatcher = function(options) {
  var Router = require('./docs/router');
  return new Router(this, options).dispatcher();
};

/**
 * Output API list.
 *
 * @api public
 */

Docs.prototype.list = function() {
  var spec = lodash.pick(
    this.framework.spec,
    'apiVersion',
    'swaggerVersion',
    'basePath',
    'apis',
    'authorizations'
  );

  ['authorizations'].forEach(function(key) {
    if (lodash.isEmpty(spec[key])) {
      delete spec[key];
    }
  });

  var apis = this.framework.apis;
  spec.apis = spec.apis.map(function(path) {
    return lodash.pick(apis[path].spec, 'path', 'description');
  });

  return spec;
};

/**
 * Output API declaration.
 *
 * @api public
 */

Docs.prototype.declaration = function(path) {
  var api = this.framework.apis[path];

  if (!api) return;

  var spec = {
    apiVersion: this.framework.spec.apiVersion,
    swaggerVersion: this.framework.spec.swaggerVersion,
    basePath: api.basePath || this.framework.spec.basePath,
    resourcePath: path,
    description: api.spec.description,
    consumes: api.spec.consumes,
    produces: api.spec.produces,
    authorizations: api.spec.authorizations,
    apis: api.spec.apis,
    models: {},
  };

  var optional = [
    'description',
    'consumes',
    'produces',
    'authorizations',
  ];

  optional.forEach(function(key) {
    if (lodash.isEmpty(spec[key])) {
      delete spec[key];
    }
  });

  var models = {};

  spec.apis = spec.apis.map(function(path) {
    var resource = api.resources[path];
    var spec = lodash.pick(resource.spec, 'path', 'operations');

    spec.operations = spec.operations.map(function(method) {
      var operation = resource.operations[method];

      // merge models
      lodash.merge(models, utils.getOperationModels(operation.spec));

      return operation.spec;
    });

    return spec;
  });

  // Merge in all required models, loop until we haven't found any more
  // models.

  var length = -1;

  while (Object.keys(models).length !== length) {
    length = Object.keys(models).length;

    var keys = Object.keys(models);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      // skip already checked models
      if (spec.models[key]) continue;
      // skip undeclared models
      if (!this.models[key]) continue;

      // discover models in model
      var newModels = utils.getModels(this.models[key]);

      // add unknown models
      for (var j = 0; j < newModels.length; j++) {
        if (!models[newModels[j]]) models[newModels[j]] = true;
      }

      spec.models[key] = this.models[key];
    }
  }

  return spec;
};

/**
 * Expose Docs.
 */

module.exports = Docs;
