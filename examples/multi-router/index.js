'use strict'

var express = require('../..');

var app = module.exports = express();
const api_v1 = require('./controllers/api_v1');
const api_v2 = require('./controllers/api_v2');
app.use('/api/v1', api_v1.handle.bind(api_v1));
app.use('/api/v2', api_v2.handle.bind(api_v2));

app.get('/', function(req, res) {
  res.send('Hello from root route.')
});

/* istanbul ignore next */
if (!require.main) {
  const server = app.listen();
  app.close = () => server.close();
  console.log(`Express started on port ${server.address().port}`);
}
