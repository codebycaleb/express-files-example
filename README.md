# express-files-example
Host a simple Express server for serving and receiving files

# Installation
```
# clone this repository
git clone https://github.com/codebycaleb/express-files-example.git

# navigate into the repository
cd express-files-example

# install dependencies
npm install

# start the server
node index.js
```

# Testing things out
```
# curl          = a command for testing out HTTP requests
# -v            = verbose mode to see headers in addition to the response
# -w "\n"       = add a newline after result (prettifies outcome)
# -F key=@value = emulates an http form with key/value params; '@' indicates filepath to follow
# loclahost:3000/[endpoint] = the URI to request

# GET /files
curl -v -w "\n" localhost:3000/files

# GET /files/:name (requires a "/files/hello-world.txt" to be present)
curl -v -w "\n" localhost:3000/files/hello-world.txt

# GET /files/:name/meta (requires a "/files/hello-world.txt" to be present)
curl -v -w "\n" localhost:3000/files/hello-world.txt/meta

# POST /files (requires a "/files/hello-world.txt" to be present)
curl -v -w "\n" -F file=@files/hello-world.txt" localhost:3000/files
```
