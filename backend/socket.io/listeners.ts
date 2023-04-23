import Clients from "./clients";
import channelValid from "../api/chatLink/utils/validateChannel";
import { SOCKET_TOPIC } from "./index";

const clients = new Clients();
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
      receiverSocket.emit(SOCKET_TOPIC.LIMIT_REACHED);
      receiverSocket.disconnect();
      return;
    }

    clients.setClientToChannel(userID, channelID, socket.id);
    socket.channelID = channelID;
    socket.userID = userID;
    // share the public key to the receiver if present
    const receiver = clients.getReceiverByChannel(channelID, userID);

    if (receiver) {
      const receiverSocket = io.sockets.sockets[receiver.sid];
      if (!receiverSocket) {
        return;
      }
      receiverSocket.emit(SOCKET_TOPIC.ON_ALICE_JOIN, { publicKey });
    }
  });

  socket.on("received", ({ channel, sender, id }) => {
    const { sid } = clients.getSenderByChannel(channel, sender);
    const senderSocket = io.sockets.sockets.get(sid);
    senderSocket.emit(SOCKET_TOPIC.DELIVERED, id);
  });

  socket.on("disconnect", () => {
    const { channelID, userID } = socket;
    if (!(channelID && userID)) {
      return;
    }
    try {
      const receiver = clients.getReceiverByChannel(channelID, userID);
      if (receiver) {
        const receiverSocket = io.sockets.sockets[receiver.sid];
        if (!receiverSocket) {
          // eslint-disable-next-line no-console
          console.log("socket not found!");
          return;
        }
        clients.deleteClient(userID, channelID);
        receiverSocket.emit(SOCKET_TOPIC.ON_ALICE_DISCONNECTED);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }
  });

  socket.emit(SOCKET_TOPIC.MESSAGE, "ping!");
};

export default connectionListener;
