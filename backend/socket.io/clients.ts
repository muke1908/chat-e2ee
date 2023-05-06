type UserSidTypes = Record<'sid', string>;
type UserRecordType = Record<string, UserSidTypes>;
type ClientRecordType = Record<string, UserRecordType>;

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
export interface ClientRecordInterface {
  getClients(): ClientRecordType,
  getClientsByChannel(channelID: string): UserRecordType,
  getSIDByIDs(userID: string, channelID: string): UserSidTypes,
  setClientToChannel(userID: string, channelID: string, sid: string): void,
  deleteClient(userID: string, channelID: string): void,
}

class Clients implements ClientRecordInterface{
  private clientRecord: ClientRecordType = {}

  getClients(): ClientRecordType { return this.clientRecord }

  getClientsByChannel(channelID: string): UserRecordType {
    if (!channelID) {
      throw new Error("channelID - required param");
    }
    return this.clientRecord[channelID] || {};
  }

  getReceiverIDBySenderID(sender: string, channelID: string): string {
    const usersInChannel = this.getClientsByChannel(channelID);
    const usersInChannelArr = Object.keys(usersInChannel);

    const receiver = usersInChannelArr.find((u) => u !== sender);
    return receiver;
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

const clientInstance = new Clients();
const getClientInstance = () => clientInstance;

export default getClientInstance;
