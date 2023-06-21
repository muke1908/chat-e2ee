import { LS } from '../../../utils/storage';
export const getKeyPairFromCache = (channelID) => {
  const keyPair_storage = LS.get('session-keyPair') || {};
  const keyPair = keyPair_storage.channelID === channelID ? keyPair_storage.keyPair : null;

  if (keyPair) {
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  }

  return null;
};

export const storeKeyPair = (channelID, { publicKey, privateKey }) => {
  const _keyPair = {
    publicKey,
    privateKey
  };
  LS.set('session-keyPair', {
    channelID,
    keyPair: _keyPair
  });
};
