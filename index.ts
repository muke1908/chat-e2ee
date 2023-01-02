require("dotenv").config();
import { initSocket } from "./backend/socket.io";
import db from "./backend/db";
import app from "./app";

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at ${PORT}`);
  db.connectDb();
});

initSocket(server);
