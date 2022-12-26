import * as http from "http";
import app from "./app";
import cluster from "cluster";
import { initSocket } from "./backend/socket.io";

const cCPUs =
  process.env.npm_lifecycle_event === "dev" || process.env.TEST
    ? process.env.cCPUs
    : require("os").cpus().length;

/**
 * Normalize a port into a number, string, or false.
 */

const normalizePort = (val: any) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;

  if (port >= 0) return port;

  return false;
};

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || 3001);
app.set("port", port);

if (cluster.isPrimary) {
  const server = http.createServer(app);
  initSocket(server);
  for (let i = 0; i < cCPUs; i++) cluster.fork();
  cluster.on("online", function (worker) {
    // eslint-disable-next-line no-console
    console.log("Worker " + worker.process.pid + " is online.");
  });
  cluster.on("exit", function (worker, code, signal) {
    // eslint-disable-next-line no-console
    console.log("worker " + worker.process.pid + " died.");
  });
} else {
  const server = http.createServer(app);
  const onError = (error: any) => {
    if (error.syscall !== "listen") throw error;

    const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        // eslint-disable-next-line no-console
        console.error(`${bind} requires elevated privileges`);
        return process.exit(1);
      case "EADDRINUSE":
        // eslint-disable-next-line no-console
        console.error(`${bind} is already in use`);
        return process.exit(1);
      default:
        throw error;
    }
  };

  const onListening = () => {
    const addr: any = server.address();
    const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
    console.log(`Listening on ${bind}`);
  };

  initSocket(server);
  server.listen(port);
  server.on("error", onError);
  server.on("listening", onListening);
}

// require("dotenv").config();
// import app from "./app";
// import { initSocket } from "./backend/socket.io";
// const { connectDb } = require("./backend/db");

// const PORT = process.env.PORT || 3001;

// const server = app.listen(PORT, () => {
//   // eslint-disable-next-line no-console
//   console.log(`Server running at ${PORT}`);
//   connectDb();
// });

// initSocket(server);
