import socketIO from "socket.io-client";
import connectionListener from "./listeners";

let io = null;

export const initSocket = (server) => {
  if (io) {
    return io;
  }

  io = socketIO.listen(server);
  // eslint-disable-next-line no-console
  console.log("Websocket is up!");

  // add listeners
  io.on("connection", (socket) => connectionListener(socket, io));

  return io;
};

export const socketEmit = (topic, sid, data) => {
  const socket = io.sockets.sockets[sid];
  socket.emit(topic, data);
};
