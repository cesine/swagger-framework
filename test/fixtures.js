'use strict';

/**
 * Module dependencies.
 */

var lodash = require('lodash');

var swagger = require('../lib');

var index = require('./fixtures/index.json');
var pet = require('./fixtures/pet.json');

/**
 * Helper functions.
 */

exports.framework = function(options) {
  options = options || {};

  var setupModels = {};

  var framework = swagger.Framework({
    basePath: options.basePath || pet.basePath,
    apiVersion: pet.apiVersion,
  });

  index.apis.forEach(function(aSpec) {
    var name = aSpec.path.slice(1);
    var data = lodash.cloneDeep(require('./fixtures/' + name + '.json'));
    var api = framework.api(aSpec);

    lodash.forOwn(data.models, function(model) {
      if (setupModels[model.id]) return;
      framework.model(model);
      setupModels[model.id] = model;
    });

    data.apis.forEach(function(rSpec) {
      var resource = api.resource({ path: rSpec.path });

      rSpec.operations.forEach(function(oSpec) {
        resource.operation(oSpec, function(req, res) {
          var request = lodash.pick(
            req.sf,
            'header',
            'path',
            'query',
            'body',
            'form'
          );

          var spec = {
            operation: req.sf.operation.spec,
            resource: req.sf.operation.resource.spec,
            api: req.sf.operation.resource.api.spec,
          };

          res.sf.reply(200, {
            request: request,
            spec: spec,
          });
        });
      });
    });
  });

  return framework;
};