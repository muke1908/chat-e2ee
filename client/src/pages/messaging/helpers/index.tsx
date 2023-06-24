import storage from "../../../utils/storage";
export { isEmptyMessage } from "./validator";
export { getKeyPairFromCache, storeKeyPair } from "./crypto";

export const getUserSessionID = (channelID: any) => {
  const userID_storage = storage.get("session-user-uuid") || {};
  console.log(userID_storage);
  const userId = userID_storage.channelID === channelID ? userID_storage.userId : null;
  return userId;
};

export const createUserSessionID = (channelID: string) => `${channelID}-${new Date().getTime()}`;

export const storeUserSessionID = (channelID: string, userId: string) => {
  storage.set("session-user-uuid", {
    channelID,
    userId
  });
};
