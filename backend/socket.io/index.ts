import { Server } from "socket.io";
import connectionListener from "./listeners";

let io: Server = null;

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
  socket.emit(topic, data);
};
