/**
 * Operation implements a Swagger operation, it validates the operation spec
 * and contains a reference to the router handler.
 *
 * It encapsulates the method (GET, POST, etc..) related metadata.
 */

'use strict';

/**
 * Module dependencies.
 */

var debug = require('debug')('swagger-framework:operation');
var schema = require('swagger-schema/spec');

/**
 * Initialize a new `Operation`.
 *
 * @param {Object} spec
 * @param {Object} options
 * @param {Function} fn
 * @api public
 */

function Operation(spec, options, fn) {
  if (typeof options === 'function') {
    fn = [].slice.call(arguments).slice(1);
    options = {};
  } else if (Array.isArray(options)) {
    fn = options;
    options = {};
  } else if (!Array.isArray(fn)) {
    fn = [].slice.call(arguments).slice(2);
  }

  if (!(this instanceof Operation)) {
    return new Operation(spec, options, fn);
  }

  if (typeof spec !== 'object') {
    throw new Error('operation spec must be an object');
  }

  debug('create operation', spec);

  this.spec = spec;
  this.options = options || {};
  this.fn = fn;
  this.middleware = {};
}

/**
 * Setup operation.
 *
 * @param {Resource} resource
 * @api private
 */

Operation.prototype.setup = function(resource) {
  var spec = this.spec;

  debug('setup operation %s', this.spec.method, this.spec);

  schema.validateThrow('OperationObject', spec);

  var unique = {};

  // check for duplicate parameters
  spec.parameters.forEach(function(parameter) {
    if (unique.hasOwnProperty(parameter.name)) {
      var err = new Error('Duplicate parameter name: ' + parameter.name);
      err.message += '\n' + JSON.stringify(spec, null, 2);
      throw err;
    }

    if (parameter.paramType === 'body' && parameter.name !== 'body') {
      throw new Error('Invalid parameter name (rename to body): ' +
                      parameter.name);
    }

    unique[parameter.name] = true;
  });

  // check for duplicate nicknames
  if (resource.api.nicknames.hasOwnProperty(spec.nickname) &&
      resource.api.nicknames[spec.nickname] !== this) {
    var conflict = resource.api.nicknames[spec.nickname];

    var err = new Error('Duplicate nickname: ' + spec.nickname);
    err.message += '\n' + JSON.stringify(spec, null, 2);
    err.message += '\nConflicts with:';
    err.message += '\n' + JSON.stringify(conflict.spec, null, 2);
    throw err;
  }

  resource.api.nicknames[spec.nickname] = this;

  this.resource = this.parent = resource;
};

/**
 * Get option.
 */

Operation.prototype.option = function(key, defaultValue) {
  if (this.options.hasOwnProperty(key)) {
    return this.options[key];
  }

  if (this.resource) {
    return this.resource.option(key, defaultValue);
  }

  return defaultValue;
};

/**
 * Expose Operation.
 */

module.exports = Operation;
