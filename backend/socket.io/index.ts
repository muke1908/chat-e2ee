import { Server } from "socket.io";
import { ChatMessageType } from "../api/messaging";
import connectionListener from "./listeners";

let io: Server = null;
export enum SOCKET_TOPIC {
  CHAT_MESSAGE='chat-message',
  LIMIT_REACHED='limit-reached',
  ON_ALICE_JOIN='on-alice-join',
  DELIVERED = 'delivered',
  ON_ALICE_DISCONNECTED = 'on-alice-disconnect',
  MESSAGE = 'message',
}
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
//todo: improve emitDataTypes selection
type emitDataTypes<T> = T extends SOCKET_TOPIC.CHAT_MESSAGE ? ChatMessageType : unknown;

export const socketEmit = <T>(topic: T, sid: string, data: emitDataTypes<T>): void => {
  const socket = io.sockets.sockets.get(sid);
  socket.emit(topic as string, data);
};
