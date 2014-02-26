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

var schema = require('./schema');

/**
 * Initialize a new `Operation`.
 *
 * @param {Object} spec
 * @param {Function} fn
 * @api public
 */

function Operation(spec, fn) {
  if (!Array.isArray(fn)) {
    fn = [].slice.call(arguments).slice(1);
  }

  if (!(this instanceof Operation)) {
    return new Operation(spec, fn);
  }

  this.spec = spec;
  this.fn = fn;
  this.middleware = {};
}

/**
 * Convert to string representation.
 *
 * @api private
 */

Operation.prototype.toString = function() {
  return JSON.stringify(this.spec, null, 4);
};

/**
 * Setup operation.
 *
 * @param {Resource} resource
 * @api private
 */

Operation.prototype.setup = function(resource) {
  resource.api.framework.env.validateThrow(
    schema.swagger.operation,
    this.spec,
    'Operation\n' + this + '\nValidation error:'
  );

  this.resource = this.parent = resource;
};

/**
 * Expose Operation.
 */

module.exports = Operation;
