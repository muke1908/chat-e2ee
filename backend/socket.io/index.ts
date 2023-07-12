import { Server, Socket } from "socket.io";
import { ChatMessageType } from "../api/messaging/types";
import connectionListener from "./listeners";

export interface CustomSocket extends Socket {
  userID: string,
  channelID: string
}

let io: Server = null;
export enum SOCKET_TOPIC {
  CHAT_MESSAGE='chat-message',
  LIMIT_REACHED='limit-reached',
  ON_ALICE_JOIN='on-alice-join',
  DELIVERED = 'delivered',
  ON_ALICE_DISCONNECTED = 'on-alice-disconnect',
  MESSAGE = 'message',
}

type emitDataTypes = {
  [SOCKET_TOPIC.CHAT_MESSAGE]: ChatMessageType,
  [SOCKET_TOPIC.LIMIT_REACHED]: null,
  [SOCKET_TOPIC.DELIVERED]: string,
  [SOCKET_TOPIC.ON_ALICE_DISCONNECTED]: null,
  [SOCKET_TOPIC.ON_ALICE_JOIN]: {
    publicKey: string
  },
  [SOCKET_TOPIC.MESSAGE]: string,
  [key: string]: unknown,
}

export const initSocket = (server) => {
  if (io) {
    return io;
  }

  io = new Server(server, { allowEIO3: true });
  // eslint-disable-next-line no-console
  console.log("Websocket is up!");

  // add listeners
  io.on("connection", (socket) => connectionListener(socket as CustomSocket, io));

  return io;
};

export const socketEmit = <T extends keyof emitDataTypes>(topic: T, sid: string, data: emitDataTypes[T]): void => {
  const socket = io.sockets.sockets.get(sid);
  if(!socket) {
    console.warn("SKIPPING. No socket found.");
    return;
  }
  socket.emit(topic as string, data);
};
