import storage from '../../../utils/storage';
export const getKeyPairFromCache = (channelID) => {
  const keyPair_storage = storage.get('session-keyPair') || {};
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
  storage.set('session-keyPair', {
    channelID,
    keyPair: _keyPair
  });
};
