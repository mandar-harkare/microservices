var config = require('./config');
var databaseController = require('./controllers/databaseController');
var express = require('express');
var gameController = require('./controllers/gameController');
var http = require('http');
var r = require('rethinkdb');
var WebSocketServer = require('websocket').server;

var app = express();
var http = require('http').Server(app);
var webSocketServer;

(function(app) {

  // connect to RethinkDB
  // create games database and game table if necessary
  r.connect(config.rethinkdb, function(err, conn) {
    if (err) {
      console.log('Could not open a connection to initialize the database: ' + err.message);
    }
    else {
      console.log('Connected.');
      app.set('rethinkdb.conn', conn);
      databaseController.createDatabase(conn, config.rethinkdb.db)
        .then(function() {
          return databaseController.createTable(conn, 'games');
        })
        .then(function() {
          return gameController.monitorAllGames(conn);
        })
        .catch(function(err) {
          console.log('Error connecting to RethinkDB: ' + err);
        });
    }
  });

  // attach web socket server
  webSocketServer = new WebSocketServer({httpServer: http, autoAcceptConnections: false});
  webSocketServer.on('request', function(request) {
    // route connection to webSocketController
    gameController.onWebSocketConnection(app, request);
  });
})(app);

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));
// set view engine and map views directory
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// map requests
app.get('/', function(req, res) {
  res.render('index');
});

app.get('/create', (req, res) => {
  res.render('create', {});
});

app.get('/update', (req, res) => {
  gameController.getGameById(req)
  .then((game) => {
  res.render('update', {game: game});
});
});

// form submits
app.post('/create', (req, res) => {
  gameController.createGame(req)
  .then(() => {
  res.redirect("/");
});
});

app.post('/update', (req, res) => {
  gameController.updateGame(req)
  .then(() => {
  res.redirect("/");
});
});

app.post('/delete', (req, res) => {
  gameController.deleteGame(req)
  .then(() => {
  res.redirect("/");
});
});

// start server on the specified port and binding host
http.listen(config.express.port, '0.0.0.0', function() {
  console.log("Server started.")
});