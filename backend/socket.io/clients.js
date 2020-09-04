const clientRecord = {
  /*
    channelID: {
        userID1: {
            sid: <sid>
        },
        userID2: {
            sid: <sid>
        }
    }
    */
};

const clients = {
  getClients: () => clientRecord,
  getClientsByChannel: (channelID) => {
    if (!channelID) {
      throw new Error('channelID - required param');
    }
    return clientRecord[channelID];
  },
  getSenderByChannel: (channelID, userID) => {
    if (!(channelID && userID)) {
      throw new Error('channelID, userID - required param');
    }
    const users = Object.keys(clientRecord[channelID]);

    const sender = users.find((u) => u === userID);
    return clientRecord[channelID][sender];
  },
  getReceiverByChannel: (channelID, userID) => {
    if (!(channelID && userID)) {
      throw new Error('channelID, userID - required param');
    }
    const users = Object.keys(clientRecord[channelID]);

    const receiver = users.find((u) => u !== userID);
    return clientRecord[channelID][receiver];
  },
  setClientToChannel: (userID, channelID, sid) => {
    if (clientRecord[channelID]) {
      clientRecord[channelID][userID] = { sid };
    } else {
      clientRecord[channelID] = {
        [userID]: { sid }
      };
    }
  },
  deleteClient: (userID, channelID) => {
    delete clientRecord[channelID][userID];
  }
};

module.exports = clients;
