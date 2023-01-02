import { Server } from "socket.io";
import connectionListener from "./listeners";

let io = null;

export const initSocket = (server) => {
  if (io) {
    return io;
  }

  io = new Server(server, { allowEIO3: true });
  // eslint-disable-next-line no-console
  console.log("Websocket is up!");

  // add listeners
  io.on("connection", (socket) => connectionListener(socket, io));

  return io;
};

export const socketEmit = (topic, sid, data) => {
  const socket = io.sockets.sockets.get(sid);
  console.log(sid);
  var keys = Object.keys(io.sockets.sockets);
  console.log(keys);
  socket.emit(topic, data);
};
