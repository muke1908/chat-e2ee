require('dotenv').config();
const app = require('./app');
const { initSocket } = require('./backend/socket.io');

const { connectDb } = require('./backend/db');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at ${PORT}`);
  connectDb();
});

initSocket(server);
