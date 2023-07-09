require("dotenv").config();
import app from './app';
import db from './backend/db';
import { initSocket } from './backend/socket.io';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at ${PORT}`);
  db.connectDb();
});

initSocket(server);
