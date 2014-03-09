/**
 * FrameworkRouter uses a Framework object to implement an HTTP request
 * listener that routes, decodes, validates, and calls user defined handlers.
 */

'use strict';

/**
 * Module dependencies.
 */

var debug = require('debug')('swagger-framework:framework:router');
var lodash = require('lodash');
var parseUrl = require('url').parse;
var routington = require('routington');

var http = require('../http');
var middleware = require('./middleware');

/**
 * Initialize a new `FrameworkRouter`.
 *
 * @param {Framework} framework
 * @api private
 */

function FrameworkRouter(framework) {
  debug('create framework router');

  this.framework = framework;
  this.encoder = lodash.clone(http.encoder);
  this.decoder = lodash.clone(http.decoder);
}

/**
 * Stack middleware.
 *
 * @api private
 */

FrameworkRouter.prototype.stack = function(operation) {
  var stack = [];

  var ctx = {
    operation: operation,
    router: this,
  };

  stack.push(middleware.setup(ctx));
  stack.push(middleware.header(ctx));
  stack.push(middleware.produces(ctx));
  stack.push(middleware.path(ctx));
  stack.push(middleware.query(ctx));
  stack.push(middleware.authenticate(ctx));
  stack.push(middleware.consumes(ctx));
  stack.push(middleware.raw(ctx));
  stack.push(middleware.form(ctx));
  stack.push(middleware.body(ctx));
  stack.push(middleware.authorize(ctx));

  var fn = operation.fn;
  if (fn && fn.length) stack = stack.concat(fn);

  return stack.filter(function(fn) {
    return typeof fn === 'function';
  });
};

/**
 * Build routes
 *
 * @api private
 */

FrameworkRouter.prototype.build = function(trie) {
  var self = this;

  if (!trie) trie = routington();

  debug('framework router build');

  lodash.forOwn(self.framework.apis, function(api) {
    lodash.forOwn(api.resources, function(resource) {

      // convert swagger path to routington
      var path = resource.spec.path;
      path = path.replace('{format}', 'json');
      path = path.replace(/\{(\w+)\}/g, function(src, dst) {
        return ':' + dst;
      });

      // define resource path
      var node = trie.define(path)[0];

      // attach resource
      node.resource = resource;

      node.methods = {};

      // add resource methods to trie
      lodash.forOwn(resource.operations, function(operation, method) {
        debug('%s %s build', method, path);

        node.methods[method] = {
          stack: self.stack(operation),
          operation: operation
        };
      });

      node.handle = function(req, res, parentNext) {
        var method = node.methods[req.method];

        if (!method) {
          if (req.method === 'OPTIONS') {
            http.options(req, res, Object.keys(node.methods));
            return res.sf.reply(200, null);
          }

          if (req.method === 'HEAD') {
            method = node.methods.GET;
          }
        }

        if (!method) {
          debug('%s %s method not found', req.method, req.sf.url.pathname);
          return res.sf.reply(405);
        }

        req.sf.operation = method.operation;

        var i = 0;
        (function next(err) {
          if (err) {
            debug('%s %s method error: %s', req.method,
                         req.sf.url.pathname, err);
            return res.sf.reply(500, err);
          }
          var fn = method.stack[i++];
          if (fn) {
            fn(req, res, next);
          } else {
            if (typeof parentNext === 'function') {
              parentNext();
            } else {
              // TODO: what should we do here?
              debug('%s %s no more middleware', req.method,
                           req.sf.url.pathname);
              res.sf.reply(400);
            }
          }
        })();
      };
    });
  });

  return trie;
};

/**
 * Returns callback suitable `http.createServer()`.
 *
 * @api private
 */

FrameworkRouter.prototype.dispatcher = function(options) {
  var self = this;

  debug('framework router dispatcher');

  options = options || {};

  // allow user to inject their own reply
  if (!options.setup) {
    options.setup = function(req, res) {
      req.sf.reply = http.reply(req, res);
    };
  }

  // create trie
  var trie = self.build();

  // dispatch request
  return function(req, res, next) {
    // swagger object
    req.sf = res.sf = {
      url: parseUrl(req.url, true),
      router: self,
    };

    var match = trie.match(req.sf.url.pathname);

    // setup
    options.setup(req, res);

    debug('%s %s', req.method, req.sf.url.pathname);

    // match path
    if (match && match.node && match.node.handle) {
      req.params = match.param;
      return match.node.handle(req, res, next);
    }

    if (typeof next === 'function') {
      next();
    } else {
      res.sf.reply(404);
    }
  };
};

/**
 * Expose FrameworkRouter.
 */

module.exports = FrameworkRouter;
