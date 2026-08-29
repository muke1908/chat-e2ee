import getClientInstance from "./clients";
import channelValid from "../api/chatHash/utils/validateChannel";
import { socketEmit, SOCKET_TOPIC, CustomSocket, WireEnvelope } from "./index";
import { RateLimiter } from "./rateLimiter";

const clients = getClientInstance();

/** Generous enough for SDP/ICE candidates and chat text, but bounds abusive payloads. */
const MAX_ENVELOPE_BYTES = 32 * 1024;
/** Burst of 40 messages, refilling at 10/s — plenty for normal signaling/chat traffic. */
const rateLimiter = new RateLimiter({ capacity: 40, refillPerSecond: 10 });

type Ack = (response: Record<string, unknown>) => void;
const noop: Ack = () => undefined;

const isPayloadTooLarge = (payload: unknown): boolean => {
  try {
    return Buffer.byteLength(JSON.stringify(payload ?? {})) > MAX_ENVELOPE_BYTES;
  } catch {
    return true;
  }
};

/**
 * Resolves the socket id of "the other participant" in `socket`'s channel,
 * using the identity bound to the socket at `chat-join` time — never a
 * client-supplied `sender`/`channel` field. This is what makes the relay
 * "opaque and bound to the socket/room": a connected client can only ever
 * act as itself, and only within the room it actually joined.
 */
const findPeerSid = (socket: CustomSocket): string | undefined => {
  if (!socket.userID || !socket.channelID) {
    return undefined;
  }
  const receiverId = clients.getReceiverIDBySenderID(socket.userID, socket.channelID);
  return receiverId ? clients.getSIDByIDs(receiverId, socket.channelID)?.sid : undefined;
};

const connectionListener = (socket: CustomSocket, io) => {
  socket.on("chat-join", async (data) => {
    const { userID, channelID } = data || {};
    if (!userID || !channelID) {
      console.error("chat-join missing userID/channelID");
      return;
    }

    const { valid } = await channelValid(channelID);
    if (!valid) {
      console.error("Invalid channelID - ", channelID);
      return;
    }
    const usersInChannel = clients.getClientsByChannel(channelID) || {};
    const userCount = Object.keys(usersInChannel).length;

    if (userCount === 2) {
      socketEmit<SOCKET_TOPIC.LIMIT_REACHED>(SOCKET_TOPIC.LIMIT_REACHED, socket.id, null);
      socket.disconnect();
      return;
    }

    clients.setClientToChannel(userID, channelID, socket.id);
    socket.channelID = channelID;
    socket.userID = userID;

    // Notify the other participant (if any) that someone joined. No key
    // material is exchanged here any more — participants already share the
    // invite secret out of band, and derive their keys from it locally.
    const receiverId = clients.getReceiverIDBySenderID(userID, channelID);
    const receiver = receiverId && clients.getSIDByIDs(receiverId, channelID);
    if (receiver) {
      socketEmit<SOCKET_TOPIC.ON_ALICE_JOIN>(SOCKET_TOPIC.ON_ALICE_JOIN, receiver.sid, null);
    }
  });

  socket.on("chat-message", (payload: { envelope: WireEnvelope }, ack: Ack = noop) => {
    if (!socket.userID || !socket.channelID) {
      ack({ error: "Join a channel before sending messages." });
      return;
    }
    if (!rateLimiter.consume(socket.id)) {
      ack({ error: "Rate limit exceeded." });
      return;
    }
    if (isPayloadTooLarge(payload)) {
      ack({ error: "Payload too large." });
      return;
    }
    const receiverSid = findPeerSid(socket);
    if (!receiverSid) {
      ack({ error: "No receiver is in the channel." });
      return;
    }

    const id = Date.now();
    const timestamp = id;
    socketEmit<SOCKET_TOPIC.CHAT_MESSAGE>(SOCKET_TOPIC.CHAT_MESSAGE, receiverSid, {
      id,
      timestamp,
      sender: socket.userID,
      envelope: payload?.envelope,
    });
    ack({ id, timestamp });
  });

  socket.on("webrtc-signal", (payload: { envelope: WireEnvelope }, ack: Ack = noop) => {
    if (!socket.userID || !socket.channelID) {
      ack({ error: "Join a channel before signaling." });
      return;
    }
    if (!rateLimiter.consume(socket.id)) {
      ack({ error: "Rate limit exceeded." });
      return;
    }
    if (isPayloadTooLarge(payload)) {
      ack({ error: "Payload too large." });
      return;
    }
    const receiverSid = findPeerSid(socket);
    if (!receiverSid) {
      ack({ error: "No receiver is in the channel." });
      return;
    }

    socketEmit<SOCKET_TOPIC.WEBRTC_SESSION_DESCRIPTION>(SOCKET_TOPIC.WEBRTC_SESSION_DESCRIPTION, receiverSid, {
      envelope: payload?.envelope,
    });
    ack({ status: "ok" });
  });

  socket.on("received", ({ id }: { id: string | number }) => {
    const receiverSid = findPeerSid(socket);
    if (receiverSid) {
      socketEmit<SOCKET_TOPIC.DELIVERED>(SOCKET_TOPIC.DELIVERED, receiverSid, id);
    }
  });

  socket.on("disconnect", () => {
    const { channelID, userID } = socket;
    rateLimiter.reset(socket.id);
    if (!(channelID && userID)) {
      return;
    }
    try {
      const receiver = findPeerSid(socket);
      clients.deleteClient(userID, channelID);
      if (receiver) {
        socketEmit<SOCKET_TOPIC.ON_ALICE_DISCONNECTED>(SOCKET_TOPIC.ON_ALICE_DISCONNECTED, receiver, null);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }
  });

  socket.emit(SOCKET_TOPIC.MESSAGE, "ping!");
};

export default connectionListener;
