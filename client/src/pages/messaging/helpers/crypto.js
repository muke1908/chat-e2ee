import storage from '../../../utils/storage';
export const getKeyPair = (channelID) => {
  const keyPair_storage = storage.get('session-keyPair') || {};
  const keyPair = keyPair_storage.channelID === channelID ? keyPair_storage.keyPair : null;

  if (keyPair) {
    return {
      publicKey: strToTypedArr(keyPair.publicKey),
      secretKey: strToTypedArr(keyPair.secretKey)
    };
  }

  return null;
};

export const createKeyPair = () => {
  return window.nacl.box.keyPair();
};

export const storeKeyPair = (channelID, { publicKey, secretKey }) => {
  const _keyPair = {
    publicKey: typedArrayToStr(publicKey),
    secretKey: typedArrayToStr(secretKey)
  };
  storage.set('session-keyPair', {
    channelID,
    keyPair: _keyPair
  });
};

export const typedArrayToStr = (typedArray) => {
  const arr = Array.from // if available
    ? Array.from(typedArray) // use Array#from
    : typedArray.map((v) => v); // otherwise map()

  const str = JSON.stringify(arr);
  return str;
};

export const strToTypedArr = (str) => {
  const arr = JSON.parse(str);
  const typedArray = new Uint8Array(arr);
  return typedArray;
};
