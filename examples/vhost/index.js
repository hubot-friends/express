'use strict'

/**
 * Module dependencies.
 */

var express = require('../..');
var logger = require('morgan');
var vhost = require('vhost');

/*
edit /etc/hosts:

127.0.0.1       foo.example.com
127.0.0.1       bar.example.com
127.0.0.1       example.com
*/

// Main server app

var main = express();

if (!require.main) main.use(logger('dev'));

main.get('/', function(req, res){
  res.send('Hello from main app!');
});

main.get('/:sub', function(req, res){
  res.send('requested ' + req.params.sub);
});

// Redirect app

var redirect = express();

redirect.use(function(req, res){
  if (!require.main) console.log(req.vhost);
  res.redirect('http://example.com:3000/' + req.vhost[0]);
});

// Vhost app

var app = module.exports = express();

app.use(vhost('*.example.com', redirect.handle.bind(redirect))); // Serves all subdomains via Redirect app
app.use(vhost('example.com', main.handle.bind(main))); // Serves top level domain via Main server app

/* istanbul ignore next */
if (!require.main) {
  const server = app.listen();
  app.close = () => server.close();
  console.log(`Express started on port ${server.address().port}`);
}
