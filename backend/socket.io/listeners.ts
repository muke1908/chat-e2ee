import getClientInstance from "./clients";
import channelValid from "../api/chatLink/utils/validateChannel";
import { socketEmit, SOCKET_TOPIC } from "./index";

const clients = getClientInstance();
const connectionListener = (socket, io) => {
  socket.on("chat-join", async (data) => {
    const { userID, channelID, publicKey } = data;

    const { valid } = await channelValid(channelID);
    if (!valid) {
      console.error("Invalid channelID - ", channelID);
      return;
    }
    const usersInChannel = clients.getClientsByChannel(channelID) || {};
    const userCount = Object.keys(usersInChannel).length;

    if (userCount === 2) {
      const receiverSocket = io.sockets.sockets[socket.id];
      socketEmit<SOCKET_TOPIC.LIMIT_REACHED>(SOCKET_TOPIC.LIMIT_REACHED, socket.id, null);
      receiverSocket.disconnect();
      return;
    }

    clients.setClientToChannel(userID, channelID, socket.id);
    socket.channelID = channelID;
    socket.userID = userID;
    // share the public key to the receiver if present
    const receiver = clients.getSIDByIDs(userID, channelID);

    if (receiver) {
      socketEmit<SOCKET_TOPIC.ON_ALICE_JOIN>(SOCKET_TOPIC.ON_ALICE_JOIN, receiver.sid, { publicKey });
    }
  });

  socket.on("received", ({ channel, sender, id }) => {
    const { sid } = clients.getSIDByIDs(sender, channel);
    socketEmit<SOCKET_TOPIC.DELIVERED>(SOCKET_TOPIC.DELIVERED, sid, null);
  });

  socket.on("disconnect", () => {
    const { channelID, userID } = socket;
    if (!(channelID && userID)) {
      return;
    }
    try {
      const receiver = clients.getSIDByIDs(userID, channelID);
      if (receiver) {
        clients.deleteClient(userID, channelID);
        socketEmit<SOCKET_TOPIC.ON_ALICE_DISCONNECTED>(SOCKET_TOPIC.ON_ALICE_DISCONNECTED, receiver.sid, null);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }
  });

  socket.emit(SOCKET_TOPIC.MESSAGE, "ping!");
};

export default connectionListener;
