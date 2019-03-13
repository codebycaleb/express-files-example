const fs = require('fs');
const Busboy = require('busboy');
const express = require('express');
const uuidv4 = require('uuid/v4');
const _ = require('lodash');

const app = express();
const port = 3000;
const FILES_ROOT = `${__dirname}/files`;

app.get('/files', (req, res, next) => {
  /*
  I wrote this using Node 8.10's version of readdir. v10.10 introduced the
  `withFileTypes` option which should eliminate the need for `statSync` calls
  and filtering of dotfiles
  (see https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback).
  */
  fs.readdir(FILES_ROOT, (err, files) => {
    if (err) { // might be worth logging the error here, but it's almost guaranteed to be due to FILES_ROOT not existing / not having permissions to view it
      return next(); // calls error-handling function defined below
    }
    const mapped = _.flatMap(files, filename => { // https://lodash.com/docs/4.17.11#flatMap
      const stat = fs.statSync(`${FILES_ROOT}/${filename}`); // https://nodejs.org/dist/v0.8.10/docs/api/fs.html#fs_fs_statsync_path
      if (stat.isFile() && !filename.startsWith('.')) { // filters out directories and dotfiles (like .gitignore)
        return [{
          filename: filename,
          createdAt: stat.ctime.toISOString(), // https://nodejs.org/dist/v0.8.10/docs/api/fs.html#fs_class_fs_stats
        }];
      }
      return [];
    });
    const sorted = _.orderBy(mapped, ['createdAt'], ['desc']) // https://lodash.com/docs/4.17.11#orderBy
    const filenames = _.map(sorted, file => _.pick(file, ['filename'])) // https://lodash.com/docs/4.17.11#pick
    res.send({
      files: filenames
    });
  });
}, (req, res) => res.status(500).send('Error retrieving files')); // make sure you've created the directory!

app.get('/files/:name', (req, res, next) => {
  const options = {
    root: FILES_ROOT, // only serve files from the files directory
    dotfiles: 'deny' // don't serve dotfiles
  };
  const filename = req.params.name;
  res.download(`/${filename}`, filename, options, err => { // https://expressjs.com/en/4x/api.html#res.download
    if (err) { // might be worth logging the error here, but it's almost certainly because the file does not exist
      next(); // calls error-handling function defined below
    }
  });
}, (req, res) => res.sendStatus(404));

app.get('/files/:name/meta', (req, res, next) => {
  const filename = req.params.name;
  const stat = fs.statSync(`${FILES_ROOT}/${filename}`); // https://nodejs.org/dist/v0.8.10/docs/api/fs.html#fs_fs_statsync_path
  if (stat.isFile() && !filename.startsWith('.')) { // filters out directories and dotfiles (like .gitignore)
    res.send({
      filename: filename,
      createdAt: stat.ctime.toISOString(), // https://nodejs.org/dist/v0.8.10/docs/api/fs.html#fs_class_fs_stats
      size: stat.size,
      blocks: stat.blocks
    });
  } else {
    next(); // if filename is a real file but doesn't hit our criteria, throw a 404
  }
}, (req, res) => res.sendStatus(404));

app.post('/files', (req, res) => {
  var busboy = new Busboy({ // see https://github.com/mscdex/busboy#busboy-methods
    headers: req.headers,
    defCharset: 'utf8', // explicitly setting default value here
    perservePath: false, // explicit default
    limits: {
      fieldNameSize: 100, // explicit default; value is expressed in bytes
      fileSize: 1 * (1024 * 1024), // 1024 * 1024 bytes = 1024 * 1 KiB = 1 MiB
      files: 1
    }
  });
  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    const new_filename = `${uuidv4().toUpperCase()}.txt` // creates a new UUID filename
    const filepath = `${FILES_ROOT}/${new_filename}`; // appends it to the path
    const writeStream = fs.createWriteStream(filepath, { // alternatively, could use `filename` arg
      flags: 'wx',
      encoding: 'utf8',
      mode: 0666
    }); // note - this will be opened once we start reading the file from the request
    file.on('data', data => writeStream.write(data)); // pipe data to our write stream
    file.on('end', () => writeStream.end()); // close the write stream
    writeStream.on('error', (err) => res.sendStatus(500)); // might be worth logging the error here
    writeStream.on('finish', () => res.send({
      status: "success",
      filename: new_filename
    }));
  });
  req.pipe(busboy);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
