import { Server, Socket } from "socket.io";
import connectionListener from "./listeners";

export interface CustomSocket extends Socket {
  userID: string,
  channelID: string
}

/** Opaque, versioned envelope — the server never inspects its contents. */
export type WireEnvelope = { version: number, strategy: string, data: unknown };

let io: Server = null;
export enum SOCKET_TOPIC {
  CHAT_MESSAGE = 'chat-message',
  LIMIT_REACHED = 'limit-reached',
  ON_ALICE_JOIN = 'on-alice-join',
  DELIVERED = 'delivered',
  ON_ALICE_DISCONNECTED = 'on-alice-disconnect',
  MESSAGE = 'message',
  WEBRTC_SESSION_DESCRIPTION = 'webrtc-session-description'
}

type emitDataTypes = {
  // `sender`/`id`/`timestamp` are assigned by the server from the
  // authenticated socket, never taken from client input. `envelope` is
  // opaque — the server relays it verbatim.
  [SOCKET_TOPIC.CHAT_MESSAGE]: { id: number, timestamp: number, sender: string, envelope: WireEnvelope },
  [SOCKET_TOPIC.LIMIT_REACHED]: null,
  [SOCKET_TOPIC.DELIVERED]: string | number,
  [SOCKET_TOPIC.ON_ALICE_DISCONNECTED]: null,
  // No key material is exchanged any more — this is purely a presence signal.
  [SOCKET_TOPIC.ON_ALICE_JOIN]: null,
  [SOCKET_TOPIC.MESSAGE]: string,
  [SOCKET_TOPIC.WEBRTC_SESSION_DESCRIPTION]: { envelope: WireEnvelope },
  [key: string]: unknown,
}

/** Bounds the size of any single socket.io packet at the transport level, ahead of any application-level checks. */
const MAX_HTTP_BUFFER_SIZE = 64 * 1024;

export const initSocket = (server) => {
  if (io) {
    return io;
  }

  io = new Server(server, {
    allowEIO3: true,
    maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE,
    cors: {
      origin: "*",
      credentials: true
    }
  });
  // eslint-disable-next-line no-console
  console.log("Websocket is up!");

  // add listeners
  io.on("connection", (socket) => connectionListener(socket as CustomSocket, io));

  return io;
};

export const socketEmit = <T extends keyof emitDataTypes>(topic: T, sid: string, data: emitDataTypes[T]): void => {
  const socket = io.sockets.sockets.get(sid);
  if (!socket) {
    console.warn("SKIPPING. No socket found.");
    return;
  }
  socket.emit(topic as string, data);
};
