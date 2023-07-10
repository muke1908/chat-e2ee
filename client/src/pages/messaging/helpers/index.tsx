import { LS } from '../../../utils/storage';

export { isEmptyMessage } from "./validator";
export { getKeyPairFromCache, storeKeyPair } from "./crypto";

export const getUserSessionID = (channelID: any): string => {
  const userID_storage = LS.get("session-user-uuid") || {};
  const userId = userID_storage.channelID === channelID ? userID_storage.userId : null;
  return userId;
};

export const createUserSessionID = (channelID: string): string => `${channelID}-${new Date().getTime()}`;

export const storeUserSessionID = (channelID: string, userId: string): void => {
  LS.set("session-user-uuid", {
    channelID,
    userId
  });
};
