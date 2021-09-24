import storage from '../../../utils/storage';
export { isEmptyMessage } from './validator';
export {
  getKeyPairFromCache,
  createKeyPair,
  storeKeyPair,
  typedArrayToStr,
  strToTypedArr,
  encryptMsg,
  decryptMsg
} from './crypto';

export const getUserSessionID = (channelID) => {
  const userID_storage = storage.get('session-user-uuid') || {};
  return userID_storage.channelID === channelID ? userID_storage.userId : null;
};

export const createUserSessionID = (channelID) => {
  return `${channelID}-${new Date().getTime()}`;
};

export const storeUserSessionID = (channelID, userId) => {
  storage.set('session-user-uuid', {
    channelID,
    userId
  });
};
