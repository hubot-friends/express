'use strict'

/**
 * Module dependencies.
 */

var cookieSession = require('cookie-session');
var express = require('../../');

var app = module.exports = express();

// add req.session cookie support
app.use(cookieSession({ secret: 'manny is cool' }));

// do something with the session
app.use(count);

// custom middleware
function count(req, res) {
  req.session.count = (req.session.count || 0) + 1
  res.send('viewed ' + req.session.count + ' times\n')
}

/* istanbul ignore next */
if (!require.main) {
  const server = app.listen();
  app.close = () => server.close();
  console.log(`Express started on port ${server.address().port}`);
}
