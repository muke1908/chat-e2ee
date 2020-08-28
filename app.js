const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
// import controller
const apiController = require('./backend/api');

io.on('connection', (socket) => {
  socket.emit('message', 'check check');
});
http.listen(3002, () => console.log(`Websocket listening on port 3002`));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb', extended: true }));

// add routes
app.use('/api', apiController);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './client/build', 'index.html'));
  });
} else {
  app.get('/*', (req, res) => {
    res.status(500).send('Cant serve production build in dev mode, please open react dev server');
  });
}

module.exports = app;
