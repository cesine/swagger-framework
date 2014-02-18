# Swagger Framework

Swagger Framework for web services.

### Example

``` javascript
var express = require('express');
var swagger = require('swagger-framework');

var host = '127.0.0.1';
var port = 8000;
var url = 'http://' + host + ':' + port;

var framework = swagger.Framework({ basePath: url });

var api = framework.api({
  path: '/hello',
  description: 'Hello API',
  consumes: [
    'application/json',
  ],
  produces: [
    'application/json',
  ],
});

var resource = api.resource({ path: '/hello/{name}' });

resource.operation(
  {
    method: 'GET',
    path: '/hello/{name}',
    summary: 'Say hello',
    nickname: 'helloName',
    parameters: [
      {
        name: 'name',
        required: true,
        type: 'string',
        paramType: 'path',
        minimum: '1',
        maximum: '30',
      },
      {
        name: 'count',
        required: true,
        type: 'integer',
        paramType: 'query',
        minimum: '1',
        maximum: '10',
      },
    ],
    type: 'Result',
  },
  function(req, res) {
    var message = '';

    for (var i = 0; i < req.swagger.query.count; i++) {
      if (i > 0) message += ' ';
      message += 'hello ' + req.swagger.path.name;
    }

    res.swagger.reply(200, { message: message });
  }
);

framework.model({
  id: 'Result',
  properties: {
    message: { type: 'string' },
  },
  required: ['message'],
});

if (!module.parent) {
  var app = express();

  app.use('/api-docs', framework.docs.dispatcher());
  app.use(framework.dispatcher());

  app.listen(port, host, function(err) {
    if (err) throw err;
    console.log('Server started ' + url + '/');
  });
}
```

## License

This work is licensed under the MIT License (see the LICENSE file).
