'use strict'

/**
 * Module dependencies.
 */

var express = require('../../');
var path = require('path');

var app = module.exports = express();

// path to where the files are stored on disk
var FILES_DIR = path.join(__dirname, 'files')

app.get('/', (req, res) => {
  res.send('<ul>' +
    '<li>Download <a href="/files/notes/groceries.txt">notes/groceries.txt</a>.</li>' +
    '<li>Download <a href="/files/amazing.txt">amazing.txt</a>.</li>' +
    '<li>Download <a href="/files/missing.txt">missing.txt</a>.</li>' +
    '<li>Download <a href="/files/CCTV大赛上海分赛区.txt">CCTV大赛上海分赛区.txt</a>.</li>' +
    '</ul>')
});

// /files/* is accessed via req.params[0]
// but here we name it :file
app.get('/files/:file(.*)', (req, res, next) => {
  // don't let them sneak out of the FILES_DIR
  // Background: The code previously relied on resolve-path to do this, but it was removed.
  var filePath = path.join(FILES_DIR, req.params.file);
  var normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(FILES_DIR)) {
    return res.status(403).send('Forbidden');
  }

  res.download(req.params.file, { root: FILES_DIR }, err => {
    if (!err) return; // file sent
    if (err.status !== 404) return next(err); // non-404 error
    // file for download not found
    res.statusCode = 404;
    res.send('Cant find that file, sorry!');
  });
});

/* istanbul ignore next */
if (!require.main) {
  const server = app.listen();
  app.close = () => server.close();
  console.log(`Express started on port ${server.address().port}`);
}
