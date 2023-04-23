type UserSidTypes = Record<'sid', string>;
type UserRecordType = Record<string, UserSidTypes>;
type ClientRecordType = Record<string, UserRecordType>;

function singleton(target: any) {
  const instance = new target();
  target.prototype.getInstance = function() {
    return instance;
  };
}

/*
const clientRecord: ClientRecordType = {
    channelID: {
        userID1: {
            sid: <sid>
        },
        userID2: {
            sid: <sid>
        }
    }
};
*/
@singleton
class Clients {
  private clientRecord: ClientRecordType = {}

  getClients(): ClientRecordType { return this.clientRecord }

  getClientsByChannel(channelID: string): UserRecordType {
    if (!channelID) {
      throw new Error("channelID - required param");
    }
    return this.clientRecord[channelID];
  }

  getSIDByIDs(userID: string, channelID: string): UserSidTypes {
    if (!(channelID && userID)) {
      throw new Error("channelID, userID - required param");
    }

    if(!this.clientRecord[channelID]) {
      return null;
    }
    const users = Object.keys(this.clientRecord[channelID]);

    const user = users.find((u) => u === userID);
    return this.clientRecord[channelID][user];
  }

  setClientToChannel(userID: string, channelID: string, sid: string): void {
    if (this.clientRecord[channelID]) {
      this.clientRecord[channelID][userID] = { sid };
    } else {
      this.clientRecord[channelID] = {
        [userID]: { sid }
      };
    }
  }

  deleteClient(userID: string, channelID: string): void {
    delete this.clientRecord[channelID][userID];
  }

}

export default Clients;
