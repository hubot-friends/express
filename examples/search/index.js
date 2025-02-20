'use strict'

// install redis first:
// https://redis.io/

// then:
// $ npm install redis
// $ redis-server

/**
 * Module dependencies.
 */

var express = require('../..');
var path = require('path');
var redis = require('redis');

var db = redis.createClient()

// npm install redis

var app = express();

app.use(express.static(path.join(__dirname, 'public')));

// populate search
db.on('ready', function(){
  db.sAdd('ferret', 'tobi');
  db.sAdd('ferret', 'loki');
  db.sAdd('ferret', 'jane');
  db.sAdd('cat', 'manny');
  db.sAdd('cat', 'luna');
});

/**
 * GET search for :query.
 */

app.get('/search/:query?', function(req, res){
  var query = req.params.query;
  db.smembers(query, function(err, vals){
    if (err) return res.send(500);
    res.send(vals);
  });
});

/**
 * GET client javascript. Here we use sendFile()
 * because serving __dirname with the static() middleware
 * would also mean serving our server "index.js" and the "search.jade"
 * template.
 */

app.get('/client.js', function(req, res){
  res.sendFile(path.join(__dirname, 'client.js'));
});

/* istanbul ignore next */
if (!require.main) {
  const server = app.listen();
  app.close = () => server.close();
  console.log(`Express started on port ${server.address().port}`);
}
