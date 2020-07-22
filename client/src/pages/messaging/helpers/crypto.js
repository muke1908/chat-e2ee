import storage from '../../../utils/storage';
export const getKeyPair = (uuid) => {
  const keyPair_storage = storage.get('session-keyPair') || {};
  const keyPair = keyPair_storage.uuid === uuid ? keyPair_storage.keyPair : null;
  return keyPair;
};

export const createKeyPair = () => {
  return window.nacl.box.keyPair();
};

export const storeKeyPair = (uuid, keyPair) => {
  storage.set('session-keyPair', {
    uuid,
    keyPair
  });
};
