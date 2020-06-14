const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// import controller
const apiController = require('./backend/api');

// create express instance
const app = express();

app.use(cors());
app.use(bodyParser.json());

//add routes
if(process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'))
}else {
    app.get('/', (req, res)=> {
        res.status(500).send('Cant serve production build in dev mode, please open react dev server')
    })
}
app.use('/api', apiController);

module.exports = app;
