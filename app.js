const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
// import controller
const apiController = require('./backend/api');

// create express instance
const app = express();

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
